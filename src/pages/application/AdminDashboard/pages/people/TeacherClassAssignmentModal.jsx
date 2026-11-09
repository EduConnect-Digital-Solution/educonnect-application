import React, { useState, useEffect } from 'react';
import { Loader2, Plus, X, Layers } from 'lucide-react';
import { Drawer, Field, inputClass, EmptyState, pushToast } from '../../../../../components/patterns';
import { assignClasses } from '../../../../auth/authAPIs.js';
import { getSchoolClasses } from '../../services/classAPIs.js';
import { getClassArms } from '../../services/armAPIs.js';
import { ROUTES } from '../../navigation/navConfig.js';

/**
 * TeacherClassAssignmentModal — modern Academic-Placement-style class assignment.
 * Replaces the deprecated registry modal: fetches real classes + arms, structured
 * selections, loading / empty / validation, design-system components.
 *
 * Teacher → Class (+ optional Arm). Student visibility is derived from this
 * placement automatically — teachers are never assigned individual students.
 */
export default function TeacherClassAssignmentModal({ teacher, schoolId, onClose, onAssigned }) {
    const [classes, setClasses] = useState([]);
    const [arms, setArms] = useState([]);
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [loadingArms, setLoadingArms] = useState(false);

    const [classId, setClassId] = useState('');
    const [armId, setArmId] = useState('');
    const [placements, setPlacements] = useState([]); // [{ classId, className, armId, armName }]
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await getSchoolClasses();
                setClasses(res.data?.classes ?? []);
            } catch {
                pushToast({ message: 'Could not load classes.' });
            } finally {
                setLoadingClasses(false);
            }
        })();
    }, []);

    const onClassChange = async (id) => {
        setClassId(id);
        setArmId('');
        setArms([]);
        if (!id) return;
        try {
            setLoadingArms(true);
            const res = await getClassArms(id);
            setArms(res.data?.arms ?? []);
        } catch {
            setArms([]);
        } finally {
            setLoadingArms(false);
        }
    };

    const addPlacement = () => {
        if (!classId) { setError('Choose a class to add.'); return; }
        const cls = classes.find(c => c.id === classId);
        const arm = arms.find(a => a.id === armId);
        // de-dupe on class + arm
        if (placements.some(p => p.classId === classId && p.armId === (armId || null))) {
            setError('That class / arm is already added.');
            return;
        }
        setPlacements(prev => [...prev, { classId, className: cls?.name ?? '', armId: armId || null, armName: arm?.name ?? null }]);
        setClassId(''); setArmId(''); setArms([]); setError(null);
    };

    const removePlacement = (i) => setPlacements(prev => prev.filter((_, idx) => idx !== i));

    const submit = async () => {
        if (placements.length === 0) { setError('Add at least one class placement.'); return; }
        setSaving(true);
        setError(null);
        try {
            await assignClasses({
                teacherId: teacher.id,
                schoolId,
                classes: placements.map(p => p.className),       // current backend contract (names)
                arms: placements.filter(p => p.armId).map(p => p.armId), // forward-compat (see README)
            });
            pushToast({ message: `Classes assigned to ${teacher.name}` });
            onAssigned?.();
            onClose();
        } catch (e) {
            setError(e?.message || 'Failed to assign classes.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Drawer
            open
            onClose={onClose}
            title="Assign classes"
            subtitle={`${teacher?.name} — student visibility follows class placement`}
            footer={
                <>
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button onClick={submit} disabled={saving || placements.length === 0}
                        className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
                        {saving && <Loader2 size={14} className="animate-spin" />} Assign {placements.length || ''}
                    </button>
                </>
            }
        >
            {loadingClasses ? (
                <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                    <Loader2 size={16} className="animate-spin" /> Loading classes…
                </div>
            ) : classes.length === 0 ? (
                <EmptyState variant="first-use" icon={Layers} compact
                    title="No classes yet"
                    description="Create your classes and arms first — teacher placement needs them."
                    prerequisite={{ label: 'Set up classes', to: ROUTES.classes }} />
            ) : (
                <>
                    {/* Selected placements */}
                    {placements.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {placements.map((p, i) => (
                                <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[12px] font-semibold text-blue-700">
                                    {p.className}{p.armName ? ` · ${p.armName}` : ''}
                                    <button onClick={() => removePlacement(i)} className="text-blue-400 hover:text-blue-700"><X size={12} /></button>
                                </span>
                            ))}
                        </div>
                    )}

                    <Field label="Class" required>
                        <select className={inputClass(false)} value={classId} onChange={e => onClassChange(e.target.value)}>
                            <option value="">Choose a class…</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </Field>

                    <Field label="Arm" hint={loadingArms ? 'loading…' : 'optional'}>
                        <select className={inputClass(false)} value={armId} onChange={e => setArmId(e.target.value)} disabled={!classId || loadingArms || arms.length === 0}>
                            <option value="">{arms.length === 0 ? 'No arms — whole class' : 'All arms / choose one'}</option>
                            {arms.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </Field>

                    <button onClick={addPlacement} disabled={!classId}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-[13px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                        <Plus size={14} /> Add placement
                    </button>

                    {error && <p className="text-[12px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
                </>
            )}
        </Drawer>
    );
}
