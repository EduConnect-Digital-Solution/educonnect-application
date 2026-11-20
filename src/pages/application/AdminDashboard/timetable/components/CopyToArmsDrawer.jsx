import React, { useState, useMemo } from 'react';
import { Drawer, pushToast } from '../../../../../components/patterns';
import { copyTimetable } from '../timetableAPIs.js';

/**
 * Copy the open arm's saved timetable into other arms. Copies land as drafts
 * (so conflicts are checked when each arm is published); teachers are cleared
 * by default because one teacher cannot be in two arms at the same time.
 */
export default function CopyToArmsDrawer({ open, onClose, arms, classes = [], source, termId }) {
    const [picked, setPicked] = useState([]);
    const [keepTeachers, setKeepTeachers] = useState(false);
    const [overwrite, setOverwrite] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const groups = useMemo(() => {
        const map = new Map();
        (arms || []).filter(a => a.id !== source.armId).forEach(a => {
            const list = map.get(a.classId) || [];
            list.push(a); map.set(a.classId, list);
        });
        return [...map.entries()];
    }, [arms, source.armId]);

    const toggle = (id) => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));
    const close = () => { if (!busy) { setError(null); onClose(); } };

    const submit = async () => {
        setBusy(true); setError(null);
        try {
            const r = await copyTimetable({
                source: { classId: source.classId, armId: source.armId, termId },
                targets: picked.map(armId => ({ armId })),
                keepTeachers, overwrite,
            });
            if (r.copied.length) pushToast({ type: 'success', message: `Copied to ${r.copied.length} arm${r.copied.length === 1 ? '' : 's'} as drafts. Open each one to review and publish.` });
            if (r.skipped.length) pushToast({ type: 'info', message: `Skipped: ${r.skipped.map(s => `${s.label || 'an arm'} (${s.reason.toLowerCase()})`).join(', ')}` });
            setPicked([]);
            onClose();
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Could not copy the timetable.');
        } finally { setBusy(false); }
    };

    return (
        <Drawer open={open} onClose={close} title="Copy timetable to other arms"
            subtitle={`From ${source.label}. The saved version is copied.`}
            footer={(
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={close} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
                    <button type="button" onClick={submit} disabled={busy || picked.length === 0}
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-40">
                        {busy ? 'Copying...' : `Copy to ${picked.length || ''} arm${picked.length === 1 ? '' : 's'}`}
                    </button>
                </div>
            )}>
            <div className="flex flex-col gap-5">
                {groups.length === 0 && <p className="text-sm text-gray-500">There are no other arms to copy to.</p>}
                {groups.map(([classId, list]) => (
                    <fieldset key={classId}>
                        <legend className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">{classes.find(c => c.id === classId)?.name || 'Class'}</legend>
                        <div className="flex flex-col gap-1.5">
                            {list.map(a => (
                                <label key={a.id} className="flex items-center gap-2 text-sm text-gray-700">
                                    <input type="checkbox" checked={picked.includes(a.id)} onChange={() => toggle(a.id)} /> Arm {a.name}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                ))}
                <div className="border-t border-gray-100 pt-4 flex flex-col gap-2">
                    <label className="flex items-start gap-2 text-sm text-gray-700"><input type="checkbox" className="mt-1" checked={keepTeachers} onChange={e => setKeepTeachers(e.target.checked)} />
                        <span>Keep teachers<span className="block text-xs text-gray-400">Off by default: the same teacher would be booked in two arms at the same time.</span></span></label>
                    <label className="flex items-start gap-2 text-sm text-gray-700"><input type="checkbox" className="mt-1" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} />
                        <span>Replace existing drafts<span className="block text-xs text-gray-400">Arms with a published timetable are still replaced only if this is on.</span></span></label>
                </div>
                {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            </div>
        </Drawer>
    );
}
