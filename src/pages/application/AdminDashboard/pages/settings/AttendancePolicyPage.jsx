import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import SettingsBreadcrumb from '../../components/ui/SettingsBreadcrumb.jsx';
import { getSettings, saveSettingsSection } from '../../services/schoolSettingsAPIs.js';
import { notify } from '@/components/patterns/toastBus.js';
import { DetailSkeleton } from '../../../../../components/patterns';

const fieldClass = 'px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 disabled:bg-gray-50 disabled:text-gray-400';

function Row({ title, hint, children }) {
    return (
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 py-5 border-b border-gray-100 last:border-0">
            <div className="md:max-w-md">
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{hint}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">{children}</div>
        </div>
    );
}

function Switch({ checked, onChange, label }) {
    return (
        <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
            className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
        </button>
    );
}

function PolicyContent() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState(null);
    const [saved, setSaved] = useState(null);

    useEffect(() => {
        let alive = true;
        getSettings()
            .then((s) => { if (alive) { setForm(s.attendancePolicy); setSaved(s.attendancePolicy); } })
            .catch((e) => alive && setError(e.message))
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, []);

    if (loading) return <DetailSkeleton />;
    if (error || !form) return <p className="text-sm text-red-600">{error || 'Could not load settings'}</p>;

    const limited = form.editWindowHours !== null;
    const dirty = JSON.stringify(form) !== JSON.stringify(saved);
    const patchDigest = (p) => setForm((f) => ({ ...f, parentDigest: { ...f.parentDigest, ...p } }));

    const save = async () => {
        setSaving(true);
        try {
            const next = await saveSettingsSection('attendancePolicy', form);
            setForm(next); setSaved(next);
            notify.success('Attendance policy saved.');
        } catch (e) { notify.error(e.message); } finally { setSaving(false); }
    };

    return (
        <div className="flex flex-col gap-6 max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Attendance Policy</h1>
                <p className="text-sm text-gray-500 mt-1">How teachers record attendance, how long they can correct it, and what parents are told.</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl px-5">
                <Row title="Late grace" hint="A pupil who arrives within this many minutes of the period start counts as present, not late. Teachers enter the arrival time and the register applies the rule. Set 0 to turn it off.">
                    <input type="number" min={0} max={60} className={`${fieldClass} w-20 text-center`} aria-label="Late grace in minutes"
                        value={form.lateGraceMinutes} onChange={(e) => setForm((f) => ({ ...f, lateGraceMinutes: Number(e.target.value) }))} />
                    <span className="text-sm text-gray-500">minutes</span>
                </Row>

                <Row title="Edit window" hint="How long after submitting a register the teacher can still correct it. Counted from the moment they submit. You can reopen a register at any time from the attendance overview.">
                    <select className={fieldClass} aria-label="Edit window" value={limited ? 'limited' : 'none'}
                        onChange={(e) => setForm((f) => ({ ...f, editWindowHours: e.target.value === 'none' ? null : 24 }))}>
                        <option value="none">No limit</option>
                        <option value="limited">Limit to…</option>
                    </select>
                    {limited && (<>
                        <input type="number" min={1} max={720} className={`${fieldClass} w-24 text-center`} aria-label="Edit window in hours"
                            value={form.editWindowHours} onChange={(e) => setForm((f) => ({ ...f, editWindowHours: Number(e.target.value) }))} />
                        <span className="text-sm text-gray-500">hours</span>
                    </>)}
                </Row>

                <Row title="Evening email to parents" hint="One email per parent each day, listing the periods their child missed or arrived late for, so parents are never sent one email per period. Parents can always see every period on their dashboard.">
                    <Switch checked={form.parentDigest.enabled} onChange={(v) => patchDigest({ enabled: v })} label="Send the evening attendance email" />
                </Row>

                <Row title="Send time" hint="When the evening email goes out, in the school's timezone (set under Locale). Registers corrected before this time are reflected; corrections after it are not emailed.">
                    <input type="time" className={fieldClass} aria-label="Send time" disabled={!form.parentDigest.enabled}
                        value={form.parentDigest.sendTime} onChange={(e) => patchDigest({ sendTime: e.target.value })} />
                </Row>
            </div>

            <div className="flex items-center gap-3">
                <button onClick={save} disabled={!dirty || saving} className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {saving ? 'Saving…' : 'Save changes'}
                </button>
                {dirty && <button onClick={() => setForm(saved)} className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900">Discard</button>}
            </div>
        </div>
    );
}

export default function AttendancePolicyPage() {
    return (
        <AdminLayout>
            <SettingsBreadcrumb section="Attendance Policy" />
            <PolicyContent />
        </AdminLayout>
    );
}
