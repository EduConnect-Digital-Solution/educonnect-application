import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    ClipboardList, BookOpen, AlertCircle, Loader2, Plus,
    ChevronDown, Pencil, Trash2, Eye, X as XIcon,
    CheckCircle2, Clock, BarChart3, FileText, ChevronRight,
    Users, Calendar,
} from 'lucide-react';
import TeacherLayout from './components/layout/TeacherLayout.jsx';
import { Drawer, pushToast } from '../../../components/patterns';
import { useAcademic } from '../../../contexts/AcademicContext.jsx';
import {
    getTeacherClasses,
    getSubjectsByClass,
    getStudentsByClassandSubject,
    getEffectivePolicy,
} from './services/scoreEntryAPIs.js';
import {
    listAssessmentEntries,
    createAssessmentEntry,
    updateAssessmentEntry,
    deleteAssessmentEntry,
    saveEntryScores,
    ASSESSMENT_TYPES,
} from './services/assessmentEntryAPIs.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso) => iso
    ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

function calcContrib(rawScore, maxScore, contributionPoints) {
    const s = Number(rawScore);
    const m = Number(maxScore);
    const c = Number(contributionPoints);
    if (!m || !c || isNaN(s) || s < 0) return null;
    return parseFloat(((s / m) * c).toFixed(2));
}

// Build unified component list from policy (CA components + exam as one entry)
function buildComponents(policy) {
    if (!policy) return [];
    const ca = (policy.caComponents ?? []).map(c => ({
        id:            c.id,
        name:          c.name,
        maxScore:      c.maxScore,
        componentType: 'ca',
    }));
    return [
        ...ca,
        { id: 'exam', name: 'Exam', maxScore: policy.examMax, componentType: 'exam' },
    ];
}

// ─── Policy banner ────────────────────────────────────────────────────────────

function PolicyBanner({ policy, loading, hasPermission }) {
    if (loading) {
        return (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                <Loader2 size={12} className="animate-spin" /> Checking assessment policy…
            </div>
        );
    }
    if (policy === undefined) return null;

    if (!policy) {
        if (hasPermission) {
            return (
                <div className="flex items-start gap-2.5 p-3 bg-violet-50 border border-violet-200 rounded-xl text-xs text-violet-800">
                    <BookOpen size={14} className="mt-0.5 shrink-0 text-violet-500" />
                    <div>
                        <p className="font-semibold">No policy created yet for this class</p>
                        <p className="mt-0.5 text-violet-700">
                            You have permission to define your own assessment policy.{' '}
                            <Link
                                to="/dashboard/teacher/assessment-policies"
                                className="font-bold underline underline-offset-2 hover:text-violet-900"
                            >
                                Assessment Policies →
                            </Link>
                        </p>
                    </div>
                </div>
            );
        }
        return (
            <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-500" />
                <div>
                    <p className="font-semibold">No assessment policy assigned</p>
                    <p className="mt-0.5 text-amber-700">
                        Ask your admin to set up an assessment policy for this class and subject.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-start gap-3 pt-4 mt-4 border-t border-gray-100">
            <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600 shrink-0 mt-0.5">
                <BookOpen size={13} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-700">{policy.name}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {(policy.caComponents ?? []).map(c => (
                        <span key={c.id} className="text-[11px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded">
                            {c.name} <span className="font-bold">/{c.maxScore}</span>
                        </span>
                    ))}
                    <span className="text-[11px] text-gray-400">+</span>
                    <span className="text-[11px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded">
                        Exam <span className="font-bold">/{policy.examMax}</span>
                    </span>
                    <span className="text-[11px] text-gray-400">=</span>
                    <span className="text-[11px] bg-green-100 text-green-700 font-bold font-mono px-1.5 py-0.5 rounded">100</span>
                </div>
            </div>
        </div>
    );
}

// ─── Component card ───────────────────────────────────────────────────────────

function ComponentCard({ component, entries, onAdd, onEdit, onDelete, onView }) {
    const compEntries = entries.filter(e => e.policyComponentId === component.id);
    const usedPoints  = compEntries.reduce((s, e) => s + Number(e.contributionPoints), 0);
    const remaining   = component.maxScore - usedPoints;
    const pct         = component.maxScore > 0 ? Math.min(100, Math.round((usedPoints / component.maxScore) * 100)) : 0;
    const isComplete  = remaining <= 0;

    const statusColor = isComplete
        ? 'bg-green-50 border-green-200'
        : usedPoints > 0
            ? 'bg-blue-50/30 border-blue-200'
            : 'bg-white border-gray-200';

    return (
        <div className={`rounded-2xl border p-4 transition-colors ${statusColor}`}>
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900">{component.name}</p>
                        {component.componentType === 'exam' && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 font-semibold rounded">
                                EXAM
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                        {usedPoints}/{component.maxScore} pts allocated
                        {remaining > 0 && (
                            <span className="ml-1 text-gray-400">· {remaining} remaining</span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {isComplete ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">
                            <CheckCircle2 size={10} /> Complete
                        </span>
                    ) : usedPoints > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                            <Clock size={10} /> In Progress
                        </span>
                    ) : (
                        <span className="text-[10px] font-semibold px-2 py-1 bg-gray-100 text-gray-500 rounded-full">
                            Not Started
                        </span>
                    )}
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-3">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-blue-400'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>

            {/* Assessment entries for this component */}
            {compEntries.length > 0 && (
                <div className="space-y-1.5 mb-3">
                    {compEntries.map(entry => (
                        <div
                            key={entry.id}
                            className="flex items-center gap-2 px-3 py-2 bg-white/80 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors"
                        >
                            <FileText size={11} className="text-gray-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-800 truncate">{entry.title}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                    {entry.assessmentType} · {entry.contributionPoints} pts · {entry.scores?.length ?? 0} students · {fmtDate(entry.createdAt)}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => onView(entry)}
                                    className="p-1 rounded-md text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                                    title="View"
                                >
                                    <Eye size={12} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onEdit(entry)}
                                    className="p-1 rounded-md text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                    title="Edit"
                                >
                                    <Pencil size={12} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDelete(entry)}
                                    className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add button */}
            <button
                type="button"
                onClick={() => onAdd(component.id)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-blue-600 border border-dashed border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
                <Plus size={12} /> Add Assessment to {component.name}
            </button>
        </div>
    );
}

// ─── Grading history table ────────────────────────────────────────────────────

function GradingHistory({ entries, onView, onEdit, onDelete }) {
    if (entries.length === 0) {
        return (
            <div className="py-10 text-center">
                <BarChart3 size={28} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No assessments recorded yet</p>
                <p className="text-xs text-gray-300 mt-1">
                    Click "Add Assessment" on a component card above to record your first entry.
                </p>
            </div>
        );
    }

    const sorted = [...entries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assessment</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Component</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contribution</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Students</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((entry, idx) => {
                        const isEven = idx % 2 === 1;
                        return (
                            <tr key={entry.id} className={`border-b border-gray-100 ${isEven ? 'bg-gray-50/40' : 'bg-white'}`}>
                                <td className="px-4 py-3">
                                    <p className="font-semibold text-gray-800">{entry.title}</p>
                                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">/{entry.maxObtainableScore} pts raw</p>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                                        {entry.assessmentType}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                        entry.componentType === 'exam'
                                            ? 'bg-purple-100 text-purple-700'
                                            : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {entry.policyComponentName}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className="font-mono font-bold text-gray-800 text-sm">
                                        {entry.contributionPoints}
                                    </span>
                                    <span className="text-[10px] text-gray-400 ml-0.5">pts</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className="text-sm font-medium text-gray-700">
                                        {entry.scores?.length ?? 0}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <Calendar size={11} className="text-gray-400 shrink-0" />
                                        {fmtDate(entry.createdAt)}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center justify-end gap-1">
                                        <button type="button" onClick={() => onView(entry)} title="View"
                                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                            <Eye size={11} /> View
                                        </button>
                                        <button type="button" onClick={() => onEdit(entry)} title="Edit"
                                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                            <Pencil size={11} /> Edit
                                        </button>
                                        <button type="button" onClick={() => onDelete(entry)} title="Delete"
                                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={11} /> Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ─── Delete confirmation dialog ───────────────────────────────────────────────

function DeleteConfirm({ entry, onConfirm, onCancel, deleting }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
            <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 p-6 max-w-sm w-full">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-100 rounded-xl">
                        <Trash2 size={18} className="text-red-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900">Delete Assessment</p>
                        <p className="text-xs text-gray-500">This cannot be undone</p>
                    </div>
                </div>
                <p className="text-sm text-gray-700 mb-1">
                    You are about to permanently delete <strong>"{entry.title}"</strong>.
                </p>
                <p className="text-xs text-gray-500 mb-5">
                    All student scores for this assessment will also be deleted.
                </p>
                <div className="flex gap-2">
                    <button type="button" onClick={onCancel} disabled={deleting}
                        className="flex-1 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors">
                        Cancel
                    </button>
                    <button type="button" onClick={onConfirm} disabled={deleting}
                        className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors">
                        {deleting && <Loader2 size={13} className="animate-spin" />}
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Assessment drawer ────────────────────────────────────────────────────────
// Handles create, edit, and view modes in a single side drawer.

function AssessmentDrawer({
    open,
    mode,         // 'create' | 'edit' | 'view'
    drawerStep,   // 'details' | 'scores'  (only relevant for create mode)
    entry,        // existing entry when mode = 'edit' | 'view'
    allComponents,
    defaultComponentId,
    students,
    entries,      // all existing entries (for contribution remaining calc)
    onClose,
    onSaved,
    className,
    subjectName,
    termId,
}) {
    const isCreate  = mode === 'create';
    const isEdit    = mode === 'edit';
    const isView    = mode === 'view';
    const readOnly  = isView;

    // ── Form fields ──────────────────────────────────────────────────────────
    const [componentId,      setComponentId]      = useState('');
    const [title,            setTitle]            = useState('');
    const [assessmentType,   setAssessmentType]   = useState('');
    const [customType,       setCustomType]       = useState('');
    const [maxScore,         setMaxScore]         = useState('');
    const [contribution,     setContribution]     = useState('');
    const [step,             setStep]             = useState('details'); // 'details' | 'scores'
    const [scoreMap,         setScoreMap]         = useState({});        // { [studentId]: string }
    const [saving,           setSaving]           = useState(false);
    const [typeIsCustom,     setTypeIsCustom]     = useState(false);

    // Populate form when drawer opens
    useEffect(() => {
        if (!open) return;
        if (isCreate) {
            setComponentId(defaultComponentId ?? '');
            setTitle('');
            setAssessmentType('');
            setCustomType('');
            setMaxScore('');
            setContribution('');
            setStep(drawerStep ?? 'details');
            const init = {};
            students.forEach(s => { init[s.id] = ''; });
            setScoreMap(init);
            setTypeIsCustom(false);
        } else if ((isEdit || isView) && entry) {
            setComponentId(entry.policyComponentId ?? '');
            setTitle(entry.title ?? '');
            const knownType = ASSESSMENT_TYPES.includes(entry.assessmentType);
            setAssessmentType(knownType ? entry.assessmentType : '');
            setCustomType(knownType ? '' : (entry.assessmentType ?? ''));
            setTypeIsCustom(!knownType);
            setMaxScore(String(entry.maxObtainableScore ?? ''));
            setContribution(String(entry.contributionPoints ?? ''));
            setStep('details');
            // Pre-fill scores
            const init = {};
            students.forEach(s => { init[s.id] = ''; });
            (entry.scores ?? []).forEach(sc => { init[sc.studentId] = String(sc.scoreObtained ?? ''); });
            setScoreMap(init);
        }
    }, [open, mode, entry, defaultComponentId, drawerStep, students]);

    // ── Derived ──────────────────────────────────────────────────────────────
    const selectedComponent = allComponents.find(c => c.id === componentId);
    const effectiveType     = typeIsCustom ? customType.trim() : assessmentType;

    // Contribution remaining (exclude current entry if editing)
    const usedElsewhere = useMemo(() => {
        return entries
            .filter(e => e.policyComponentId === componentId && e.id !== entry?.id)
            .reduce((s, e) => s + Number(e.contributionPoints), 0);
    }, [entries, componentId, entry?.id]);

    const maxContribution  = selectedComponent ? (selectedComponent.maxScore - usedElsewhere) : 0;
    const contribNum       = Number(contribution);
    const maxScoreNum      = Number(maxScore);
    const contribValid     = contribNum > 0 && contribNum <= maxContribution;
    const detailsComplete  = componentId && title.trim() && effectiveType && maxScoreNum > 0 && contribValid;
    const gradedCount      = Object.values(scoreMap).filter(v => v !== '').length;

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                policyComponentId:   componentId,
                policyComponentName: selectedComponent?.name ?? '',
                componentType:       selectedComponent?.componentType ?? 'ca',
                title:               title.trim(),
                assessmentType:      effectiveType,
                maxObtainableScore:  maxScoreNum,
                contributionPoints:  contribNum,
            };

            let targetEntryId;
            if (isCreate) {
                const res = await createAssessmentEntry({
                    ...payload,
                    className,
                    subjectName,
                    termId,
                });
                targetEntryId = res.data.entry.id;
            } else {
                await updateAssessmentEntry(entry.id, {
                    title:              title.trim(),
                    assessmentType:     effectiveType,
                    maxObtainableScore: maxScoreNum,
                    contributionPoints: contribNum,
                });
                targetEntryId = entry.id;
            }

            // Save scores
            const scores = students.map(s => ({
                studentId:     s.id,
                studentName:   s.fullName,
                scoreObtained: Number(scoreMap[s.id]) || 0,
            })).filter(s => s.scoreObtained > 0);

            await saveEntryScores(targetEntryId, scores);

            pushToast({
                message: isCreate ? 'Assessment recorded successfully.' : 'Assessment updated.',
                type: 'success',
            });
            onSaved();
        } catch (e) {
            pushToast({ message: e?.message || 'Failed to save. Please try again.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    // ── Details form ─────────────────────────────────────────────────────────
    const detailsPanel = (
        <div className="space-y-4">
            {/* Component selector */}
            <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em] mb-1.5">
                    What are you grading?
                </label>
                <div className="relative">
                    <select
                        value={componentId}
                        onChange={e => setComponentId(e.target.value)}
                        disabled={readOnly}
                        className="w-full appearance-none px-3 py-2.5 pr-8 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 bg-white disabled:bg-gray-50 disabled:text-gray-500"
                    >
                        <option value="">— select assessment component —</option>
                        {allComponents.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name} ({c.maxScore} pts)
                            </option>
                        ))}
                    </select>
                    {!readOnly && <ChevronDown size={14} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />}
                </div>
                {selectedComponent && (
                    <p className="mt-1.5 text-[11px] text-gray-500">
                        <span className="font-semibold text-gray-700">{maxContribution} pts</span> available in this component
                        {usedElsewhere > 0 && <span className="text-gray-400"> ({usedElsewhere} already allocated)</span>}
                    </p>
                )}
            </div>

            {/* Title */}
            <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em] mb-1.5">
                    Assessment Title
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    disabled={readOnly}
                    placeholder="e.g. Class Test 1, Mid-Term Quiz"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 disabled:bg-gray-50 disabled:text-gray-500"
                />
            </div>

            {/* Assessment type */}
            <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em] mb-1.5">
                    Assessment Type
                </label>
                {!typeIsCustom ? (
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <select
                                value={assessmentType}
                                onChange={e => setAssessmentType(e.target.value)}
                                disabled={readOnly}
                                className="w-full appearance-none px-3 py-2.5 pr-8 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 bg-white disabled:bg-gray-50 disabled:text-gray-500"
                            >
                                <option value="">— select type —</option>
                                {ASSESSMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            {!readOnly && <ChevronDown size={14} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />}
                        </div>
                        {!readOnly && (
                            <button type="button" onClick={() => setTypeIsCustom(true)}
                                className="px-3 py-2.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap">
                                Custom
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={customType}
                            onChange={e => setCustomType(e.target.value)}
                            disabled={readOnly}
                            placeholder="e.g. Portfolio Review"
                            className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 disabled:bg-gray-50 disabled:text-gray-500"
                        />
                        {!readOnly && (
                            <button type="button" onClick={() => { setTypeIsCustom(false); setCustomType(''); }}
                                className="px-3 py-2.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap">
                                Use list
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Max score + contribution */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em] mb-1.5">
                        Max Obtainable Score
                    </label>
                    <input
                        type="number"
                        value={maxScore}
                        onChange={e => setMaxScore(e.target.value)}
                        disabled={readOnly}
                        min={1}
                        placeholder="e.g. 70"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                    <p className="mt-1 text-[10px] text-gray-400">What this assessment is marked out of</p>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em] mb-1.5">
                        Contribution towards total (pts)
                    </label>
                    <input
                        type="number"
                        value={contribution}
                        onChange={e => setContribution(e.target.value)}
                        disabled={readOnly}
                        min={1}
                        max={maxContribution || undefined}
                        placeholder={selectedComponent ? `max ${maxContribution}` : 'e.g. 8'}
                        className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-500 ${
                            contribution && !contribValid && !readOnly
                                ? 'border-red-300 bg-red-50 focus:ring-red-500/20'
                                : 'border-gray-200 focus:ring-blue-500/20 focus:border-blue-300'
                        }`}
                    />
                    {contribution && !contribValid && !readOnly && (
                        <p className="mt-1 text-[10px] text-red-500">
                            Must be between 1 and {maxContribution} pts
                        </p>
                    )}
                    {contribValid && selectedComponent && (
                        <p className="mt-1 text-[10px] text-green-600">
                            Counts {contribNum} of {selectedComponent.maxScore} pts toward {selectedComponent.name}
                        </p>
                    )}
                </div>
            </div>

            {/* Contribution formula hint */}
            {maxScoreNum > 0 && contribValid && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-[11px] text-blue-700 font-semibold mb-1">Score calculation</p>
                    <p className="text-[11px] text-blue-600">
                        Student score ÷ {maxScoreNum} × {contribNum} = CA points earned
                    </p>
                    <p className="text-[11px] text-blue-500 mt-0.5">
                        e.g. 52/{maxScoreNum} → {calcContrib(52, maxScoreNum, contribNum) ?? '?'} pts toward {selectedComponent?.name ?? 'component'}
                    </p>
                </div>
            )}
        </div>
    );

    // ── Score grid ────────────────────────────────────────────────────────────
    const scoresPanel = (
        <div className="space-y-3">
            {/* Summary bar */}
            <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Users size={13} />
                    <span><strong className="text-gray-800">{gradedCount}</strong>/{students.length} students graded</span>
                </div>
                <span className="text-[11px] font-mono text-gray-500">
                    Scores out of {maxScore || entry?.maxObtainableScore || '?'}
                </span>
            </div>

            {/* Score rows */}
            <div className="space-y-1.5">
                {students.map((student, idx) => {
                    const raw    = scoreMap[student.id] ?? '';
                    const maxS   = maxScoreNum || Number(entry?.maxObtainableScore) || 0;
                    const pts    = Number(contribution) || Number(entry?.contributionPoints) || 0;
                    const cc     = raw !== '' ? calcContrib(raw, maxS, pts) : null;
                    const over   = raw !== '' && Number(raw) > maxS && maxS > 0;

                    return (
                        <div key={student.id} className="flex items-center gap-3 px-3 py-2 bg-white border border-gray-100 rounded-xl">
                            <span className="text-[10px] text-gray-400 font-mono w-5 shrink-0">{idx + 1}</span>
                            <p className="flex-1 text-sm font-medium text-gray-700 truncate">{student.fullName}</p>
                            <div className="flex items-center gap-2 shrink-0">
                                <input
                                    type="number"
                                    value={raw}
                                    disabled={readOnly}
                                    min={0}
                                    max={maxS || undefined}
                                    onChange={e => setScoreMap(prev => ({ ...prev, [student.id]: e.target.value }))}
                                    placeholder="—"
                                    className={`w-16 px-2 py-1.5 text-center font-mono text-sm rounded-lg border focus:outline-none focus:ring-2 transition-colors ${
                                        over
                                            ? 'border-red-300 bg-red-50 text-red-700 focus:ring-red-500/20'
                                            : 'border-gray-200 focus:border-blue-300 focus:ring-blue-500/20'
                                    } ${readOnly ? 'bg-gray-50 text-gray-500 cursor-default' : ''}`}
                                />
                                <div className="w-14 text-right">
                                    {cc !== null ? (
                                        <span className={`text-xs font-bold font-mono ${over ? 'text-red-600' : 'text-blue-600'}`}>
                                            {cc} pts
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-300">— pts</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // ── Drawer title ─────────────────────────────────────────────────────────
    const drawerTitle = isCreate ? 'New Assessment Entry'
        : isEdit ? `Edit — ${entry?.title ?? ''}`
        : entry?.title ?? 'View Assessment';

    const drawerSubtitle = isCreate ? 'Record an assessment event for this class and subject'
        : isView ? `${entry?.policyComponentName} · ${entry?.assessmentType}`
        : undefined;

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={drawerTitle}
            subtitle={drawerSubtitle}
        >
            {/* Step tabs — only for create mode */}
            {isCreate && (
                <div className="flex bg-gray-100 rounded-xl p-1 mb-2">
                    <button
                        type="button"
                        onClick={() => setStep('details')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            step === 'details'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        1 · Assessment Details
                    </button>
                    <button
                        type="button"
                        onClick={() => { if (detailsComplete) setStep('scores'); }}
                        disabled={!detailsComplete}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            step === 'scores'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : detailsComplete
                                    ? 'text-gray-500 hover:text-gray-700'
                                    : 'text-gray-300 cursor-not-allowed'
                        }`}
                    >
                        2 · Student Scores
                    </button>
                </div>
            )}

            {/* Content */}
            {(isCreate ? step === 'details' : true) && detailsPanel}

            {/* Score panel header (edit/view always shown; create only on step 2) */}
            {((isEdit || isView) || (isCreate && step === 'scores')) && (
                <>
                    <div className="border-t border-gray-100 pt-4 mt-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em] mb-3">
                            Student Scores
                        </p>
                        {scoresPanel}
                    </div>
                </>
            )}

            {/* Action buttons */}
            {!isView && (
                <div className="flex gap-2 pt-2">
                    {isCreate && step === 'details' && (
                        <>
                            <button type="button" onClick={onClose} disabled={saving}
                                className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors">
                                Cancel
                            </button>
                            <button type="button" onClick={() => setStep('scores')} disabled={!detailsComplete}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                Continue to Scores <ChevronRight size={14} />
                            </button>
                        </>
                    )}
                    {(isEdit || (isCreate && step === 'scores')) && (
                        <>
                            <button type="button" onClick={isCreate ? () => setStep('details') : onClose} disabled={saving}
                                className="flex-1 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors">
                                {isCreate ? '← Back' : 'Cancel'}
                            </button>
                            <button type="button" onClick={handleSave} disabled={saving || !detailsComplete}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                {saving && <Loader2 size={14} className="animate-spin" />}
                                {isCreate ? 'Save Assessment' : 'Save Changes'}
                            </button>
                        </>
                    )}
                </div>
            )}
        </Drawer>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main page
// ═════════════════════════════════════════════════════════════════════════════

export default function ScoreEntryPage() {
    const { currentTerm } = useAcademic();

    // ── Selector state ────────────────────────────────────────────────────────
    const [classes,         setClasses]         = useState([]);
    const [subjects,        setSubjects]        = useState([]);
    const [selectedClass,   setSelectedClass]   = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');

    const [loadingClasses,  setLoadingClasses]  = useState(true);
    const [loadingSubjects, setLoadingSubjects] = useState(false);
    const [loadingData,     setLoadingData]     = useState(false);

    // ── Data state ────────────────────────────────────────────────────────────
    const [policy,         setPolicy]         = useState(undefined);
    const [hasPermission,  setHasPermission]  = useState(false);
    const [students,       setStudents]       = useState([]);
    const [entries,        setEntries]        = useState([]);

    // ── Drawer state ──────────────────────────────────────────────────────────
    const [drawerOpen,          setDrawerOpen]          = useState(false);
    const [drawerMode,          setDrawerMode]          = useState('create');
    const [drawerStep,          setDrawerStep]          = useState('details');
    const [drawerEntry,         setDrawerEntry]         = useState(null);
    const [drawerDefaultCompId, setDrawerDefaultCompId] = useState('');

    // ── Delete state ──────────────────────────────────────────────────────────
    const [confirmEntry, setConfirmEntry] = useState(null);
    const [deleting,     setDeleting]     = useState(false);

    // ── Load classes ──────────────────────────────────────────────────────────
    useEffect(() => {
        setLoadingClasses(true);
        getTeacherClasses()
            .then(res => setClasses(res.data?.classes ?? []))
            .catch(() => pushToast({ message: 'Failed to load your classes.', type: 'error' }))
            .finally(() => setLoadingClasses(false));
    }, []);

    // ── Load subjects on class change ─────────────────────────────────────────
    useEffect(() => {
        if (!selectedClass) {
            setSubjects([]); setSelectedSubject('');
            setPolicy(undefined); setHasPermission(false);
            setStudents([]); setEntries([]);
            return;
        }
        setLoadingSubjects(true);
        setSelectedSubject('');
        setPolicy(undefined); setHasPermission(false);
        setStudents([]); setEntries([]);

        getSubjectsByClass(selectedClass)
            .then(res => setSubjects(res.data?.subjects ?? []))
            .catch(() => pushToast({ message: 'Failed to load subjects.', type: 'error' }))
            .finally(() => setLoadingSubjects(false));
    }, [selectedClass]);

    // ── Load policy, students, entries on subject change ──────────────────────
    const loadSheetData = useCallback(async () => {
        if (!selectedClass || !selectedSubject || !currentTerm?.id) return;

        setLoadingData(true);
        setPolicy(undefined); setHasPermission(false);
        setStudents([]); setEntries([]);

        try {
            const [policyRes, studentsRes, entriesRes] = await Promise.all([
                getEffectivePolicy(selectedClass, selectedSubject),
                getStudentsByClassandSubject(selectedClass, selectedSubject),
                listAssessmentEntries(selectedClass, selectedSubject, currentTerm.id),
            ]);

            setPolicy(policyRes.data?.policy ?? null);
            setHasPermission(policyRes.data?.hasPermission ?? false);
            setStudents(studentsRes.data?.students ?? []);
            setEntries(entriesRes.data?.entries ?? []);
        } catch {
            pushToast({ message: 'Failed to load grading data. Please retry.', type: 'error' });
            setPolicy(null);
        } finally {
            setLoadingData(false);
        }
    }, [selectedClass, selectedSubject, currentTerm?.id]);

    useEffect(() => { loadSheetData(); }, [loadSheetData]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const components     = useMemo(() => buildComponents(policy), [policy]);
    const selectionReady = selectedClass && selectedSubject;

    // ── Drawer openers ────────────────────────────────────────────────────────
    const openCreate = useCallback((defaultCompId = '') => {
        setDrawerMode('create');
        setDrawerStep('details');
        setDrawerEntry(null);
        setDrawerDefaultCompId(defaultCompId);
        setDrawerOpen(true);
    }, []);

    const openEdit = useCallback((entry) => {
        setDrawerMode('edit');
        setDrawerStep('details');
        setDrawerEntry(entry);
        setDrawerDefaultCompId('');
        setDrawerOpen(true);
    }, []);

    const openView = useCallback((entry) => {
        setDrawerMode('view');
        setDrawerStep('details');
        setDrawerEntry(entry);
        setDrawerDefaultCompId('');
        setDrawerOpen(true);
    }, []);

    // ── Delete flow ───────────────────────────────────────────────────────────
    const handleDeleteConfirmed = async () => {
        if (!confirmEntry) return;
        setDeleting(true);
        try {
            await deleteAssessmentEntry(confirmEntry.id);
            setEntries(prev => prev.filter(e => e.id !== confirmEntry.id));
            pushToast({ message: `"${confirmEntry.title}" deleted.`, type: 'success' });
            setConfirmEntry(null);
        } catch (e) {
            pushToast({ message: e?.message || 'Delete failed.', type: 'error' });
        } finally {
            setDeleting(false);
        }
    };

    // ── After save ────────────────────────────────────────────────────────────
    const handleSaved = useCallback(async () => {
        setDrawerOpen(false);
        // Reload entries to get fresh calculated contributions
        try {
            const res = await listAssessmentEntries(selectedClass, selectedSubject, currentTerm?.id);
            setEntries(res.data?.entries ?? []);
        } catch {
            await loadSheetData();
        }
    }, [selectedClass, selectedSubject, currentTerm?.id, loadSheetData]);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <TeacherLayout>
            <div className="flex flex-col gap-5">

                {/* Page header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
                            Grading
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Record assessments incrementally throughout the term.
                        </p>
                    </div>
                    {selectionReady && policy && (
                        <button
                            type="button"
                            onClick={() => openCreate('')}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                        >
                            <Plus size={15} /> New Assessment
                        </button>
                    )}
                </div>

                {/* Selector card */}
                <div className="bg-white border border-gray-200 p-5 shadow-sm">
                    <div className="flex flex-wrap mb-5 gap-4 items-end">

                        {/* Class */}
                        <div className="flex-1 min-w-[180px]">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5">
                                Class
                            </label>
                            <div className="relative">
                                {loadingClasses && (
                                    <Loader2 size={13} className="absolute right-3 top-3 text-gray-400 animate-spin" />
                                )}
                                <select
                                    value={selectedClass}
                                    onChange={e => setSelectedClass(e.target.value)}
                                    disabled={loadingClasses}
                                    className="w-full appearance-none px-3 py-2.5 pr-8 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 bg-white disabled:opacity-60"
                                >
                                    <option value="">— select class —</option>
                                    {classes.map(c => (
                                        <option key={c.id ?? c.name} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                                {!loadingClasses && <ChevronDown size={14} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />}
                            </div>
                        </div>

                        {/* Subject */}
                        <div className="flex-1 min-w-[180px]">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5">
                                Subject
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedSubject}
                                    onChange={e => setSelectedSubject(e.target.value)}
                                    disabled={!selectedClass || loadingSubjects}
                                    className="w-full appearance-none px-3 py-2.5 pr-8 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 bg-white disabled:opacity-60"
                                >
                                    <option value="">— select subject —</option>
                                    {subjects.map(s => (
                                        <option key={s.id ?? s.name} value={s.name}>{s.name}</option>
                                    ))}
                                </select>
                                {loadingSubjects
                                    ? <Loader2 size={13} className="absolute right-3 top-3 text-gray-400 animate-spin" />
                                    : <ChevronDown size={14} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
                                }
                            </div>
                        </div>

                        {/* Term */}
                        <div className="shrink-0">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5">
                                Term
                            </label>
                            <div className="px-3 py-2.5 text-sm font-semibold text-gray-700 bg-slate-50 border border-gray-200  whitespace-nowrap">
                                {currentTerm?.name ?? 'No active term'}
                            </div>
                        </div>
                    </div>

                    {/* Policy banner */}
                    {selectionReady && (
                        <PolicyBanner policy={policy} loading={loadingData} hasPermission={hasPermission} />
                    )}
                </div>

                {/* ── Content area ── */}
                {!selectionReady ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="p-4 bg-gray-100 rounded-2xl mb-4">
                            <ClipboardList size={32} className="text-gray-300" />
                        </div>
                        <p className="text-sm font-semibold text-gray-400">Select a class and subject to begin</p>
                        <p className="text-xs text-gray-300 mt-1">
                            Your assessment components will appear once a selection is made.
                        </p>
                    </div>

                ) : loadingData ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={24} className="animate-spin text-blue-500" />
                    </div>

                ) : policy === null ? null : policy ? (
                    <>
                        {/* ── Component cards ── */}
                        <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <div>
                                    <h2 className="text-sm font-bold text-gray-900">Assessment Components</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Track grading progress per component. Add assessments incrementally throughout the term.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {entries.length > 0 && (
                                        <span className="text-[11px] text-gray-400 font-medium">
                                            {entries.length} assessment{entries.length !== 1 ? 's' : ''} recorded
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="p-5 grid sm:grid-cols-2 gap-4">
                                {components.map(comp => (
                                    <ComponentCard
                                        key={comp.id}
                                        component={comp}
                                        entries={entries}
                                        onAdd={openCreate}
                                        onEdit={openEdit}
                                        onView={openView}
                                        onDelete={(entry) => setConfirmEntry(entry)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* ── Grading history ── */}
                        <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <div>
                                    <h2 className="text-sm font-bold text-gray-900">Grading History</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        All assessments recorded for this class and subject this term.
                                    </p>
                                </div>
                                {entries.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => openCreate('')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors"
                                    >
                                        <Plus size={12} /> Add
                                    </button>
                                )}
                            </div>
                            <GradingHistory
                                entries={entries}
                                onView={openView}
                                onEdit={openEdit}
                                onDelete={(entry) => setConfirmEntry(entry)}
                            />
                        </div>
                    </>
                ) : null}
            </div>

            {/* Assessment drawer */}
            <AssessmentDrawer
                open={drawerOpen}
                mode={drawerMode}
                drawerStep={drawerStep}
                entry={drawerEntry}
                allComponents={components}
                defaultComponentId={drawerDefaultCompId}
                students={students}
                entries={entries}
                onClose={() => setDrawerOpen(false)}
                onSaved={handleSaved}
                className={selectedClass}
                subjectName={selectedSubject}
                termId={currentTerm?.id}
            />

            {/* Delete confirmation */}
            {confirmEntry && (
                <DeleteConfirm
                    entry={confirmEntry}
                    onConfirm={handleDeleteConfirmed}
                    onCancel={() => setConfirmEntry(null)}
                    deleting={deleting}
                />
            )}
        </TeacherLayout>
    );
}
