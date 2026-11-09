import React, { useState, useEffect } from 'react';
import { Loader2, BookOpen, Check } from 'lucide-react';
import { Drawer, EmptyState, pushToast } from '../../../../../components/patterns';
import { assignSubjects } from '../../../../auth/authAPIs.js';
import { getSchoolSubjects } from '../../services/subjectAPIs.js';
import { ROUTES } from '../../navigation/navConfig.js';

/**
 * TeacherSubjectAssignmentModal — assign subjects via the new endpoint.
 *   POST /api/admin/teachers/assign-subjects  { teacherId, subjects: [subjectId…] }
 *
 * Multi-select from the real subject catalogue; already-assigned subjects are
 * pre-checked (matched by name, which is what the teacher record carries).
 */
export default function TeacherSubjectAssignmentModal({ teacher, onClose, onAssigned }) {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(() => new Set());
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    const alreadyAssigned = new Set((teacher?.subjects ?? []).map(s => String(s).toLowerCase()));

    useEffect(() => {
        (async () => {
            try {
                const res = await getSchoolSubjects();
                const list = res.data?.subjects ?? [];
                setSubjects(list);
                // pre-select subjects the teacher already has (matched by name)
                const pre = new Set(list.filter(s => alreadyAssigned.has(String(s.name).toLowerCase())).map(s => s.id));
                setSelected(pre);
            } catch {
                pushToast({ message: 'Could not load subjects.' });
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggle = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
        setError(null);
    };

    const submit = async () => {
        const ids = [...selected];
        if (ids.length === 0) { setError('Select at least one subject.'); return; }
        setSaving(true);
        setError(null);
        try {
            await assignSubjects({ teacherId: teacher.id, subjects: ids });
            pushToast({ message: `Subjects updated for ${teacher.name}` });
            onAssigned?.();
            onClose();
        } catch (e) {
            setError(e?.message || 'Failed to assign subjects.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Drawer
            open
            onClose={onClose}
            title="Assign subjects"
            subtitle={teacher?.name}
            footer={
                <>
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button onClick={submit} disabled={saving}
                        className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving && <Loader2 size={14} className="animate-spin" />} Save subjects
                    </button>
                </>
            }
        >
            {loading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                    <Loader2 size={16} className="animate-spin" /> Loading subjects…
                </div>
            ) : subjects.length === 0 ? (
                <EmptyState variant="first-use" icon={BookOpen} compact
                    title="No subjects yet"
                    description="Build your subject catalogue first, then assign subjects to teachers."
                    prerequisite={{ label: 'Set up subjects', to: ROUTES.subjects }} />
            ) : (
                <>
                    <p className="text-[12px] text-gray-400">{selected.size} selected</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                        {subjects.map(s => {
                            const on = selected.has(s.id);
                            return (
                                <button key={s.id} onClick={() => toggle(s.id)}
                                    className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-left transition-colors ${
                                        on ? 'border-blue-300 bg-blue-50/60' : 'border-gray-200 bg-white hover:bg-gray-50'
                                    }`}>
                                    <span className="min-w-0">
                                        <span className="block text-[13px] font-semibold text-gray-800 truncate">{s.name}</span>
                                        {s.code && <span className="block text-[11px] text-gray-400">{s.code}</span>}
                                    </span>
                                    <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${on ? 'bg-blue-600 text-white' : 'border border-gray-300'}`}>
                                        {on && <Check size={13} />}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    {error && <p className="text-[12px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
                </>
            )}
        </Drawer>
    );
}
