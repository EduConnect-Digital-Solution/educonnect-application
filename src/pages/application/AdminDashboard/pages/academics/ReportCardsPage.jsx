import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    LayoutTemplate, MessageSquareText, Send, GripVertical, Eye, EyeOff,
    ArrowUp, ArrowDown, Loader2, Save, CheckCircle2, XCircle, Lock,
    FileText, ShieldCheck, Printer, Users, Star,
} from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import {
    StatusChip, EmptyState, Drawer, pushToast,
} from '../../../../../components/patterns';
import { useAcademic } from '../../../../../contexts/AcademicContext.jsx';
import { getSchoolClasses } from '../../services/classAPIs.js';
import { getClassArms } from '../../services/armAPIs.js';
import {
    getReportCardTemplate, saveReportCardTemplate,
    getReportCardComments, saveReportCardComment, REPORT_CARD_TRAITS,
    generateReportCards, getPdfJob, signOffReportCards, publishReportCardsToParents,
} from '../../services/gradingAPIs.js';

const TABS = [
    { id: 'template', label: 'Template Builder',  icon: LayoutTemplate },
    { id: 'comments', label: 'Comments Worklist', icon: MessageSquareText },
    { id: 'release',  label: 'Generate & Release', icon: Send },
];

const ACCENTS = [
    { value: 'blue',   class: 'bg-blue-600' },
    { value: 'green',  class: 'bg-green-600' },
    { value: 'purple', class: 'bg-purple-600' },
    { value: 'amber',  class: 'bg-amber-500' },
    { value: 'slate',  class: 'bg-slate-700' },
];

const ACCENT_HEX = {
    blue: '#2563eb', green: '#16a34a', purple: '#9333ea', amber: '#f59e0b', slate: '#334155',
};

// ═════════════════════════════════════════════════════════════════════════════
// Shared: Class → Arm picker
// ═════════════════════════════════════════════════════════════════════════════

function ClassArmPicker({ classId, armId, onClassChange, onArmChange }) {
    const [classes, setClasses] = useState([]);
    const [arms, setArms]       = useState([]);
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [loadingArms, setLoadingArms]       = useState(false);

    useEffect(() => {
        setLoadingClasses(true);
        getSchoolClasses()
            .then(res => setClasses(res.data?.classes ?? []))
            .catch(() => pushToast({ message: 'Failed to load classes.', type: 'error' }))
            .finally(() => setLoadingClasses(false));
    }, []);

    useEffect(() => {
        setArms([]);
        if (!classId) return;
        setLoadingArms(true);
        getClassArms(classId)
            .then(res => setArms(res.data?.arms ?? []))
            .catch(() => pushToast({ message: 'Failed to load arms.', type: 'error' }))
            .finally(() => setLoadingArms(false));
    }, [classId]);

    return (
        <>
            <div className="flex-1 min-w-[150px]">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5">Class</label>
                <select
                    value={classId}
                    onChange={e => { onClassChange(e.target.value); onArmChange(''); }}
                    disabled={loadingClasses}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 bg-white disabled:opacity-60"
                >
                    <option value="">— select class —</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            <div className="flex-1 min-w-[150px]">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5">Arm</label>
                <select
                    value={armId}
                    onChange={e => onArmChange(e.target.value)}
                    disabled={!classId || loadingArms}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 bg-white disabled:opacity-60"
                >
                    <option value="">{loadingArms ? 'Loading…' : '— select arm —'}</option>
                    {arms.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            </div>
        </>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 1 — Template Builder
// ═════════════════════════════════════════════════════════════════════════════

const BLOCK_PREVIEW = {
    header: (accent) => (
        <div className="flex items-center gap-3 pb-3 border-b-2" style={{ borderColor: accent }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: accent }}>
                CREST
            </div>
            <div>
                <p className="text-sm font-bold text-gray-900">Your School Name</p>
                <p className="text-[9px] text-gray-400">Terminal Report · Address line · Motto</p>
            </div>
        </div>
    ),
    'student-info': () => (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px]">
            {['Name: Adaeze Okafor', 'Adm. No: ADM/22/001', 'Class: JSS1 A', 'Term: First Term', 'Position: 3rd', 'No. in Class: 28'].map(t => (
                <div key={t} className="flex justify-between border-b border-dashed border-gray-200 py-0.5">
                    <span className="text-gray-500">{t.split(':')[0]}</span>
                    <span className="font-semibold text-gray-700">{t.split(':')[1]}</span>
                </div>
            ))}
        </div>
    ),
    'results-table': (accent) => (
        <table className="w-full text-[8px] border-collapse">
            <thead>
                <tr style={{ backgroundColor: accent, color: 'white' }}>
                    {['Subject', 'CA', 'Exam', 'Total', 'Grade'].map(h => (
                        <th key={h} className="px-1 py-0.5 text-left font-semibold">{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {[['English', 24, 60, 84, 'A1'], ['Mathematics', 22, 55, 77, 'A1'], ['Basic Science', 20, 48, 68, 'B3']].map(r => (
                    <tr key={r[0]} className="border-b border-gray-100">
                        {r.map((c, i) => <td key={i} className="px-1 py-0.5 text-gray-600">{c}</td>)}
                    </tr>
                ))}
            </tbody>
        </table>
    ),
    attendance: () => (
        <div className="flex gap-3 text-[9px]">
            {[['Times Opened', '120'], ['Present', '116'], ['Absent', '4']].map(([k, v]) => (
                <div key={k} className="flex-1 bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                    <p className="text-gray-400">{k}</p>
                    <p className="font-bold text-gray-700">{v}</p>
                </div>
            ))}
        </div>
    ),
    traits: () => (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px]">
            {REPORT_CARD_TRAITS.map(t => (
                <div key={t} className="flex justify-between items-center">
                    <span className="text-gray-500">{t}</span>
                    <span className="text-amber-500">★★★★☆</span>
                </div>
            ))}
        </div>
    ),
    comments: () => (
        <div className="space-y-1.5 text-[9px]">
            <div><span className="text-gray-400 italic">Class Teacher: </span><span className="text-gray-600">A diligent and focused student. Keep it up.</span></div>
            <div><span className="text-gray-400 italic">Principal: </span><span className="text-gray-600">An excellent result. Well done.</span></div>
        </div>
    ),
    signatures: (accent) => (
        <div className="flex justify-between pt-3 text-[9px]">
            {['Class Teacher', "Principal"].map(s => (
                <div key={s} className="text-center">
                    <div className="w-20 border-b" style={{ borderColor: accent }} />
                    <p className="text-gray-400 mt-0.5">{s}</p>
                </div>
            ))}
        </div>
    ),
};

function TemplateBuilderTab() {
    const [template, setTemplate] = useState(null);
    const [loading, setLoading]   = useState(true);
    const [saving, setSaving]     = useState(false);
    const [dirty, setDirty]       = useState(false);
    const dragIndex = useRef(null);

    useEffect(() => {
        getReportCardTemplate()
            .then(res => setTemplate(res.data.template))
            .catch(() => pushToast({ message: 'Failed to load template.', type: 'error' }))
            .finally(() => setLoading(false));
    }, []);

    const mutate = (updater) => { setTemplate(updater); setDirty(true); };

    const move = (from, to) => {
        if (to < 0 || to >= template.blocks.length) return;
        mutate(prev => {
            const blocks = [...prev.blocks];
            const [b] = blocks.splice(from, 1);
            blocks.splice(to, 0, b);
            return { ...prev, blocks };
        });
    };

    const toggle = (id) => mutate(prev => ({
        ...prev,
        blocks: prev.blocks.map(b => b.id === id ? { ...b, enabled: !b.enabled } : b),
    }));

    const handleDrop = (index) => {
        const from = dragIndex.current;
        dragIndex.current = null;
        if (from === null || from === index) return;
        move(from, index);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveReportCardTemplate(template);
            setDirty(false);
            pushToast({ message: 'Report-card template saved.', type: 'success' });
        } catch (e) {
            pushToast({ message: e?.message || 'Failed to save template.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-blue-500" /></div>;
    }
    if (!template) return null;

    const accentHex = ACCENT_HEX[template.accent] ?? ACCENT_HEX.blue;

    return (
        <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="text-base font-bold text-gray-900">Template Builder</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Arrange the blocks that make up your report card. Drag to reorder, toggle to show or hide.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !dirty}
                    className="px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-2"
                >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    {dirty ? 'Save template' : 'Saved'}
                </button>
            </div>

            <div className="grid lg:grid-cols-2 gap-5">
                {/* Block list + controls */}
                <div className="flex flex-col gap-4">
                    {/* Style controls */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Accent colour</label>
                            <div className="flex gap-2">
                                {ACCENTS.map(a => (
                                    <button
                                        key={a.value}
                                        type="button"
                                        onClick={() => mutate(prev => ({ ...prev, accent: a.value }))}
                                        className={`w-7 h-7 rounded-full ${a.class} transition-transform ${template.accent === a.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                                        title={a.value}
                                    />
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Orientation</label>
                            <div className="flex gap-2">
                                {['portrait', 'landscape'].map(o => (
                                    <button
                                        key={o}
                                        type="button"
                                        onClick={() => mutate(prev => ({ ...prev, orientation: o }))}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border capitalize transition-colors ${
                                            template.orientation === o
                                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                        }`}
                                    >
                                        {o}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Blocks */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1 mb-2">Blocks · drag to reorder</p>
                        <div className="space-y-1.5">
                            {template.blocks.map((block, idx) => (
                                <div
                                    key={block.id}
                                    draggable
                                    onDragStart={() => { dragIndex.current = idx; }}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={() => handleDrop(idx)}
                                    className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-colors cursor-grab active:cursor-grabbing ${
                                        block.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
                                    }`}
                                >
                                    <GripVertical size={15} className="text-gray-300 shrink-0" />
                                    <span className="flex-1 text-sm font-medium text-gray-700">{block.label}</span>
                                    <div className="flex items-center gap-0.5">
                                        <button type="button" onClick={() => move(idx, idx - 1)} disabled={idx === 0}
                                            className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors" title="Move up">
                                            <ArrowUp size={13} />
                                        </button>
                                        <button type="button" onClick={() => move(idx, idx + 1)} disabled={idx === template.blocks.length - 1}
                                            className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors" title="Move down">
                                            <ArrowDown size={13} />
                                        </button>
                                        <button type="button" onClick={() => toggle(block.id)}
                                            className={`p-1 rounded transition-colors ${block.enabled ? 'text-blue-500 hover:bg-blue-50' : 'text-gray-300 hover:bg-gray-100'}`}
                                            title={block.enabled ? 'Hide block' : 'Show block'}>
                                            {block.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Live preview */}
                <div className="lg:sticky lg:top-4 h-fit">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                        <Eye size={12} /> Live preview
                    </p>
                    <div className={`bg-white border border-gray-200 rounded-2xl shadow-sm mx-auto p-5 space-y-3 ${template.orientation === 'landscape' ? 'max-w-full' : 'max-w-sm'}`}>
                        {template.blocks.filter(b => b.enabled).map(block => (
                            <div key={block.id}>
                                {(BLOCK_PREVIEW[block.type] ?? (() => null))(accentHex)}
                            </div>
                        ))}
                        {template.blocks.filter(b => b.enabled).length === 0 && (
                            <p className="text-center text-xs text-gray-300 py-8">All blocks hidden — enable at least one.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 2 — Comments Worklist
// ═════════════════════════════════════════════════════════════════════════════

function StarRating({ value, onChange }) {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => onChange(n)}
                    className="p-0.5 transition-transform hover:scale-110" title={`${n} / 5`}>
                    <Star size={18} className={n <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
                </button>
            ))}
        </div>
    );
}

function CommentDrawer({ student, armId, termId, traits, onClose, onSaved }) {
    const [comment, setComment] = useState('');
    const [ratings, setRatings] = useState({});
    const [saving, setSaving]   = useState(false);

    useEffect(() => {
        if (student) {
            setComment(student.comment ?? '');
            setRatings(student.traits ?? {});
        }
    }, [student]);

    if (!student) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveReportCardComment(student.id, { armId, termId, comment: comment.trim(), traits: ratings });
            pushToast({ message: `Comment saved for ${student.name}.`, type: 'success' });
            onSaved(student.id, { comment: comment.trim(), traits: ratings });
            onClose();
        } catch (e) {
            pushToast({ message: e?.message || 'Failed to save comment.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Drawer
            open={Boolean(student)}
            onClose={onClose}
            title={student.name}
            subtitle={student.admissionNo}
            footer={
                <>
                    <button type="button" onClick={onClose}
                        className="flex-1 py-2.5 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                        Cancel
                    </button>
                    <button type="button" onClick={handleSave} disabled={saving}
                        className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                        {saving && <Loader2 size={14} className="animate-spin" />} Save comment
                    </button>
                </>
            }
        >
            <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Trait ratings</label>
                <div className="space-y-2">
                    {traits.map(t => (
                        <div key={t} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{t}</span>
                            <StarRating value={ratings[t] ?? 0} onChange={(n) => setRatings(prev => ({ ...prev, [t]: n }))} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Class-teacher comment</label>
                <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    rows={5}
                    placeholder="e.g. A focused and well-behaved student who participates actively in class. Should aim for more consistency in mathematics."
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
                <p className="text-[11px] text-gray-400 mt-1.5">{comment.length} characters</p>
            </div>
        </Drawer>
    );
}

function CommentsWorklistTab() {
    const { currentTerm, loading: scopeLoading } = useAcademic();
    const [classId, setClassId] = useState('');
    const [armId, setArmId]     = useState('');

    const [loading, setLoading] = useState(false);
    const [students, setStudents] = useState([]);
    const [traits, setTraits]     = useState(REPORT_CARD_TRAITS);
    const [active, setActive]     = useState(null);

    const load = useCallback(async () => {
        if (!armId || !currentTerm?.id) { setStudents([]); return; }
        setLoading(true);
        try {
            const res = await getReportCardComments(armId, currentTerm.id);
            setStudents(res.data.students);
            setTraits(res.data.traits);
        } catch (e) {
            pushToast({ message: e?.message || 'Failed to load worklist.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [armId, currentTerm?.id]);

    useEffect(() => { load(); }, [load]);

    const handleSaved = (studentId, patch) => {
        setStudents(prev => prev.map(s =>
            s.id === studentId ? { ...s, ...patch, status: 'completed' } : s,
        ));
    };

    const completed = students.filter(s => s.status === 'completed').length;

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-base font-bold text-gray-900">Comments Worklist</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Class teachers add a personal comment and trait ratings for each student before cards are generated.
                    </p>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap items-end gap-3">
                <ClassArmPicker classId={classId} armId={armId} onClassChange={setClassId} onArmChange={setArmId} />
            </div>

            {!currentTerm?.id && !scopeLoading && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800 font-medium">
                    Select an academic term above to load the comment worklist.
                </div>
            )}

            {loading && <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-blue-500" /></div>}

            {!loading && armId && currentTerm?.id && students.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl">
                    <EmptyState variant="first-use" title="No students in this arm" description="Once students are enrolled in this arm they appear here for comments." />
                </div>
            )}

            {!loading && !armId && currentTerm?.id && (
                <div className="bg-white border border-gray-200 rounded-2xl">
                    <EmptyState variant="first-use" title="Pick a class and arm" description="Select a class and arm above to load its students for class-teacher comments." />
                </div>
            )}

            {!loading && students.length > 0 && (
                <>
                    {/* Progress */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-gray-700">{completed} of {students.length} comments completed</p>
                            <span className="text-sm font-bold text-green-600">{Math.round((completed / students.length) * 100)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${(completed / students.length) * 100}%` }} />
                        </div>
                    </div>

                    {/* Worklist table */}
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                    <th className="px-4 py-3 text-left">Student</th>
                                    <th className="px-4 py-3 text-left hidden sm:table-cell">Comment preview</th>
                                    <th className="px-4 py-3 text-center w-32">Status</th>
                                    <th className="px-4 py-3 text-right w-24"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {students.map(s => (
                                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-medium text-gray-800">{s.name}</p>
                                            <p className="text-[11px] text-gray-400 font-mono">{s.admissionNo}</p>
                                        </td>
                                        <td className="px-4 py-3 hidden sm:table-cell">
                                            <p className="text-xs text-gray-500 truncate max-w-xs">
                                                {s.comment || <span className="text-gray-300 italic">No comment yet</span>}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <StatusChip status={s.status === 'completed' ? 'completed' : 'pending'} size="xs">
                                                {s.status === 'completed' ? 'Completed' : 'Pending'}
                                            </StatusChip>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button type="button" onClick={() => setActive(s)}
                                                className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                                                {s.status === 'completed' ? 'Edit' : 'Add'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            <CommentDrawer
                student={active}
                armId={armId}
                termId={currentTerm?.id}
                traits={traits}
                onClose={() => setActive(null)}
                onSaved={handleSaved}
            />
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 3 — Generate & Release
// ═════════════════════════════════════════════════════════════════════════════

function PrereqRow({ passed, label }) {
    const Icon = passed ? CheckCircle2 : XCircle;
    return (
        <div className="flex items-center gap-2.5 py-2">
            <Icon size={16} className={passed ? 'text-green-600' : 'text-gray-300'} />
            <span className={`text-sm ${passed ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{label}</span>
        </div>
    );
}

function StageStep({ index, title, description, done, current, children }) {
    return (
        <div className="flex gap-3.5">
            <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    done ? 'bg-green-100 text-green-600' : current ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                    {done ? <CheckCircle2 size={16} /> : index}
                </div>
                <div className="w-px flex-1 bg-gray-200 my-1" />
            </div>
            <div className="flex-1 pb-6">
                <p className={`text-sm font-bold ${current || done ? 'text-gray-900' : 'text-gray-400'}`}>{title}</p>
                <p className="text-xs text-gray-400 mt-0.5 mb-2.5">{description}</p>
                {children}
            </div>
        </div>
    );
}

function GenerateReleaseTab() {
    const { currentTerm, loading: scopeLoading } = useAcademic();
    const [classId, setClassId] = useState('');
    const [armId, setArmId]     = useState('');

    // stage: 'idle' | 'generated' | 'signed' | 'published'
    const [stage, setStage]   = useState('idle');
    const [job, setJob]       = useState(null);
    const [busy, setBusy]     = useState(false);
    const pollRef = useRef(null);

    // Reset the pipeline whenever the target changes
    useEffect(() => {
        setStage('idle'); setJob(null); setBusy(false);
        clearInterval(pollRef.current);
    }, [armId, currentTerm?.id]);

    useEffect(() => () => clearInterval(pollRef.current), []);

    const ready = armId && currentTerm?.id;
    // Mock prerequisites — backend resolves these from publish + comment state.
    const prereqs = [
        { passed: true, label: 'Results published for this class' },
        { passed: true, label: 'Class-teacher comments completed' },
        { passed: true, label: 'Report-card template configured' },
    ];
    const allPrereq = prereqs.every(p => p.passed);

    const handleGenerate = async () => {
        setBusy(true); setJob({ status: 'processing', progress: 0 });
        try {
            const res = await generateReportCards({ armId, termId: currentTerm.id });
            const jobId = res.data.jobId;
            clearInterval(pollRef.current);
            pollRef.current = setInterval(async () => {
                try {
                    const jr = await getPdfJob(jobId);
                    setJob(jr.data);
                    if (jr.data.status === 'completed') {
                        clearInterval(pollRef.current);
                        setBusy(false);
                        setStage('generated');
                        pushToast({ message: 'Report cards generated.', type: 'success' });
                    }
                } catch {
                    clearInterval(pollRef.current);
                    setBusy(false);
                }
            }, 600);
        } catch (e) {
            pushToast({ message: e?.message || 'Generation failed.', type: 'error' });
            setBusy(false); setJob(null);
        }
    };

    const handleSignOff = async () => {
        setBusy(true);
        try {
            await signOffReportCards({ armId, termId: currentTerm.id });
            setStage('signed');
            pushToast({ message: 'Cards signed off by principal.', type: 'success' });
        } catch (e) {
            pushToast({ message: e?.message || 'Sign-off failed.', type: 'error' });
        } finally { setBusy(false); }
    };

    const handlePublish = async () => {
        setBusy(true);
        try {
            const res = await publishReportCardsToParents({ armId, termId: currentTerm.id });
            setStage('published');
            pushToast({ message: `${res.data.publishedCount} cards released to parents.`, type: 'success' });
        } catch (e) {
            pushToast({ message: e?.message || 'Publishing failed.', type: 'error' });
        } finally { setBusy(false); }
    };

    const handlePrint = () => {
        pushToast({ message: 'Batch sent to the print queue.', type: 'success' });
    };

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-base font-bold text-gray-900">Generate & Release</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Generate the cards, get principal sign-off, then release them to parents.
                    </p>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap items-end gap-3">
                <ClassArmPicker classId={classId} armId={armId} onClassChange={setClassId} onArmChange={setArmId} />
            </div>

            {!currentTerm?.id && !scopeLoading && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-800 font-medium">
                    Select an academic term above to begin.
                </div>
            )}

            {!ready && currentTerm?.id && (
                <div className="bg-white border border-gray-200 rounded-2xl">
                    <EmptyState variant="first-use" title="Pick a class and arm" description="Select a class and arm above to run the generation and release pipeline." />
                </div>
            )}

            {ready && (
                <div className="grid lg:grid-cols-3 gap-5">
                    {/* Prerequisites */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-5 h-fit">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck size={16} className="text-gray-400" />
                            <h3 className="text-sm font-bold text-gray-900">Prerequisites</h3>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {prereqs.map((p, i) => <PrereqRow key={i} {...p} />)}
                        </div>
                        {!allPrereq && (
                            <p className="text-[11px] text-amber-600 mt-2">Resolve all prerequisites to enable generation.</p>
                        )}
                    </div>

                    {/* Pipeline */}
                    <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5">
                        <h3 className="text-sm font-bold text-gray-900 mb-4">Release pipeline</h3>

                        <StageStep index={1} title="Generate report cards"
                            description="Render a PDF card for every student from approved results, comments, and the template."
                            done={stage !== 'idle'} current={stage === 'idle'}>
                            {job && job.status === 'processing' && (
                                <div className="mb-2 max-w-xs">
                                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                        <span className="flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" /> Generating…</span>
                                        <span className="font-semibold">{job.progress}%</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${job.progress}%` }} />
                                    </div>
                                </div>
                            )}
                            {stage === 'idle' && (!job || job.status !== 'processing') && (
                                <button type="button" onClick={handleGenerate} disabled={!allPrereq || busy}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-2">
                                    <FileText size={14} /> Generate All
                                </button>
                            )}
                        </StageStep>

                        <StageStep index={2} title="Principal sign-off"
                            description="The principal reviews the generated cards and signs off in bulk."
                            done={stage === 'signed' || stage === 'published'} current={stage === 'generated'}>
                            {stage === 'generated' && (
                                <button type="button" onClick={handleSignOff} disabled={busy}
                                    className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                                    {busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Sign Off All
                                </button>
                            )}
                            {(stage === 'signed' || stage === 'published') && (
                                <StatusChip status="approved" size="xs">Signed off</StatusChip>
                            )}
                        </StageStep>

                        <StageStep index={3} title="Release to parents"
                            description="Publish signed cards to the parent portal and optionally send to the print queue."
                            done={stage === 'published'} current={stage === 'signed'}>
                            {stage === 'signed' && (
                                <button type="button" onClick={handlePublish} disabled={busy}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />} Publish to Parents
                                </button>
                            )}
                            {stage === 'published' && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
                                        <Lock size={14} /> Released to parents
                                    </span>
                                    <button type="button" onClick={handlePrint}
                                        className="px-3 py-1.5 bg-white border border-gray-200 text-xs font-semibold text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                                        <Printer size={13} /> Batch print
                                    </button>
                                </div>
                            )}
                        </StageStep>

                        {/* Last step has no connector tail */}
                        <div className="-mt-6 ml-[15px] h-6 bg-white relative z-10" />
                    </div>
                </div>
            )}
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// Page shell
// ═════════════════════════════════════════════════════════════════════════════

function ReportCardsContent() {
    const [activeTab, setActiveTab] = useState('template');

    return (
        <div className="flex flex-col gap-5 h-full">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Report Cards</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Design the card, collect comments, then generate, sign off, and release terminal reports to parents.
                </p>
            </div>

            {/* Tab bar */}
            <div className="flex items-center gap-0.5 border-b border-gray-200 -mb-1 overflow-x-auto">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 -mb-px transition-colors whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <Icon size={15} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="flex-1 min-h-0">
                {activeTab === 'template' && <TemplateBuilderTab />}
                {activeTab === 'comments' && <CommentsWorklistTab />}
                {activeTab === 'release'  && <GenerateReleaseTab />}
            </div>
        </div>
    );
}

export default function ReportCardsPage() {
    return (
        <AdminLayout>
            <ReportCardsContent />
        </AdminLayout>
    );
}
