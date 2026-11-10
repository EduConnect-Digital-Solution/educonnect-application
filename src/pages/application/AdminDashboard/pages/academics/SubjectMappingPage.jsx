import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Grid3x3, Loader2, AlertCircle } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import { pushToast, EmptyState } from '../../../../../components/patterns';
import { getSubjectMapping, saveSubjectMapping } from '../../services/subjectMappingAPI.js';
import { ROUTES } from '../../navigation/navConfig.js';
import { Link } from 'react-router-dom';

const sameSet = (a, b) => a.size === b.size && [...a].every(x => b.has(x));

export default function SubjectMappingPage() {
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);
    const [draft, setDraft]     = useState({});   // armId -> Set(subjectId): what the grid currently shows
    const [saving, setSaving]   = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [blocked, setBlocked] = useState([]);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await getSubjectMapping();
            setData(res.data);
            setDraft(Object.fromEntries(Object.entries(res.data.mapping).map(([id, subs]) => [id, new Set(subs)])));
        } catch (e) {
            setError(e?.message || 'Could not load the subject mapping.');
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const saved = useMemo(
        () => Object.fromEntries(Object.entries(data?.mapping ?? {}).map(([id, subs]) => [id, new Set(subs)])),
        [data],
    );
    const dirtyArms = useMemo(
        () => (data?.arms ?? []).filter(a => !sameSet(draft[a.id] ?? new Set(), saved[a.id] ?? new Set())),
        [data, draft, saved],
    );

    const setCell = (armId, subjectId, on) => setDraft(prev => {
        const next = new Set(prev[armId]);
        if (on) next.add(subjectId); else next.delete(subjectId);
        return { ...prev, [armId]: next };
    });
    const setColumn = (subjectId, on) => setDraft(prev => Object.fromEntries(
        Object.entries(prev).map(([armId, set]) => { const n = new Set(set); if (on) n.add(subjectId); else n.delete(subjectId); return [armId, n]; })));
    const setRow = (armIds, on) => setDraft(prev => {
        const next = { ...prev };
        for (const armId of armIds) next[armId] = on ? new Set(data.subjects.map(s => s.id)) : new Set();
        return next;
    });
    const setClassColumn = (armIds, subjectId, on) => setDraft(prev => {
        const next = { ...prev };
        for (const armId of armIds) { const n = new Set(next[armId]); if (on) n.add(subjectId); else n.delete(subjectId); next[armId] = n; }
        return next;
    });

    const handleSave = async () => {
        setSaving(true); setSaveError(null); setBlocked([]);
        try {
            const res = await saveSubjectMapping(dirtyArms.map(a => ({ armId: a.id, subjectIds: [...draft[a.id]] })));
            pushToast({ message: `Saved. ${res.data.added} added, ${res.data.removed} removed across ${res.data.arms} ${res.data.arms === 1 ? 'arm' : 'arms'}.`, type: 'success' });
            await load();
        } catch (e) {
            setSaveError(e?.message);
            setBlocked(e?.blocked ?? []);
        } finally {
            setSaving(false);
        }
    };

    // Arms grouped by class, in the order the server sent them
    const groups = useMemo(() => {
        const out = [];
        for (const arm of data?.arms ?? []) {
            let g = out[out.length - 1];
            if (!g || g.classId !== arm.classId) { g = { classId: arm.classId, className: arm.className, arms: [] }; out.push(g); }
            g.arms.push(arm);
        }
        return out;
    }, [data]);

    const colState = (subjectId) => {
        const arms = data.arms;
        const n = arms.filter(a => draft[a.id]?.has(subjectId)).length;
        return n === 0 ? 'none' : n === arms.length ? 'all' : 'some';
    };

    return (
        <AdminLayout>
            <div className="flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <Grid3x3 size={20} className="text-indigo-600" /> Subject mapping
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Tick the subjects each class arm studies. Use a column header to apply a subject to every arm at once.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 self-start">
                        {dirtyArms.length > 0 && (
                            <button type="button" onClick={() => { setDraft(Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, new Set(v)]))); setSaveError(null); setBlocked([]); }}
                                disabled={saving} className="px-3 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                                Discard
                            </button>
                        )}
                        <button type="button" onClick={handleSave} disabled={saving || dirtyArms.length === 0}
                            className="px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-40 inline-flex items-center gap-2">
                            {saving && <Loader2 size={14} className="animate-spin" />}
                            {saving ? 'Saving…' : dirtyArms.length ? `Save changes (${dirtyArms.length} ${dirtyArms.length === 1 ? 'arm' : 'arms'})` : 'No changes'}
                        </button>
                    </div>
                </div>

                {saveError && (
                    <div role="alert" className="flex gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <div>
                            <p className="font-semibold">The mapping could not be saved</p>
                            <p className="mt-0.5">{saveError}</p>
                            {blocked.length > 0 && (
                                <ul className="mt-1 list-disc pl-4">
                                    {blocked.map(b => <li key={`${b.armId}-${b.subject}`}>{b.arm}: {b.subject}</li>)}
                                </ul>
                            )}
                        </div>
                    </div>
                )}

                {loading && <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-blue-500" /></div>}
                {error && <div className="bg-white border border-gray-200 rounded-2xl"><EmptyState variant="error" description={error} onRetry={load} /></div>}

                {!loading && !error && data && (data.arms.length === 0 || data.subjects.length === 0) && (
                    <div className="bg-white border border-gray-200 rounded-2xl">
                        <EmptyState variant="first-use"
                            title={data.arms.length === 0 ? 'No class arms yet' : 'No subjects yet'}
                            description="Create classes with arms and subjects first, then map them here."
                            action={{ label: data.arms.length === 0 ? 'Set up classes' : 'Set up subjects', to: data.arms.length === 0 ? ROUTES.classes : ROUTES.subjects }} />
                    </div>
                )}

                {!loading && !error && data && data.arms.length > 0 && data.subjects.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
                        <table className="text-sm min-w-full">
                            <thead>
                                <tr className="border-b border-gray-100 align-bottom">
                                    <th className="sticky left-0 bg-white z-10 px-4 py-3 text-left text-[11px] uppercase tracking-wide text-gray-400 font-semibold min-w-[160px]">Class arm</th>
                                    {data.subjects.map(s => {
                                        const state = colState(s.id);
                                        return (
                                            <th key={s.id} className="px-3 py-3 text-center font-semibold text-gray-700 min-w-[96px]">
                                                <label className="flex flex-col items-center gap-1.5 cursor-pointer">
                                                    <span className="text-xs leading-tight">{s.name}</span>
                                                    <input type="checkbox" aria-label={`${s.name} for every arm`} checked={state === 'all'}
                                                        ref={el => { if (el) el.indeterminate = state === 'some'; }}
                                                        onChange={e => setColumn(s.id, e.target.checked)} />
                                                </label>
                                            </th>
                                        );
                                    })}
                                    <th className="px-3 py-3 text-[11px] uppercase tracking-wide text-gray-400 font-semibold">Row</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groups.map(g => (
                                    <React.Fragment key={g.classId}>
                                        {g.arms.length > 1 && (
                                            <tr className="bg-gray-50/70">
                                                <td className="sticky left-0 bg-gray-50 z-10 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wide">{g.className} (all arms)</td>
                                                {data.subjects.map(s => {
                                                    const n = g.arms.filter(a => draft[a.id]?.has(s.id)).length;
                                                    return (
                                                        <td key={s.id} className="px-3 py-2 text-center">
                                                            <input type="checkbox" aria-label={`${s.name} for all ${g.className} arms`} checked={n === g.arms.length}
                                                                ref={el => { if (el) el.indeterminate = n > 0 && n < g.arms.length; }}
                                                                onChange={e => setClassColumn(g.arms.map(a => a.id), s.id, e.target.checked)} />
                                                        </td>
                                                    );
                                                })}
                                                <td />
                                            </tr>
                                        )}
                                        {g.arms.map(arm => {
                                            const set = draft[arm.id] ?? new Set();
                                            const changed = !sameSet(set, saved[arm.id] ?? new Set());
                                            return (
                                                <tr key={arm.id} className={`border-b border-gray-50 last:border-0 ${changed ? 'bg-amber-50/50' : ''}`}>
                                                    <td className={`sticky left-0 z-10 px-4 py-2.5 font-semibold text-gray-900 ${changed ? 'bg-amber-50' : 'bg-white'}`}>
                                                        {arm.className} {arm.name}
                                                        {changed && <span className="ml-2 text-[10px] font-bold text-amber-700 uppercase">edited</span>}
                                                    </td>
                                                    {data.subjects.map(s => (
                                                        <td key={s.id} className="px-3 py-2.5 text-center">
                                                            <input type="checkbox" aria-label={`${s.name} for ${arm.className} ${arm.name}`}
                                                                checked={set.has(s.id)} onChange={e => setCell(arm.id, s.id, e.target.checked)} />
                                                        </td>
                                                    ))}
                                                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                                                        <button type="button" onClick={() => setRow([arm.id], true)} className="text-xs font-semibold text-blue-700 hover:underline">All</button>
                                                        <span className="text-gray-300 mx-1">·</span>
                                                        <button type="button" onClick={() => setRow([arm.id], false)} className="text-xs font-semibold text-gray-500 hover:underline">None</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <p className="text-xs text-gray-500">
                    Removing a subject from an arm is blocked once scores have been entered for it. Need to add a new subject?{' '}
                    <Link to={ROUTES.subjects} className="text-blue-700 font-semibold hover:underline">Open Subjects</Link>.
                </p>
            </div>
        </AdminLayout>
    );
}
