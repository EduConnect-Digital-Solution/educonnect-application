import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import SettingsBreadcrumb from '../../components/ui/SettingsBreadcrumb.jsx';
import { ROUTES } from '../../navigation/navConfig.js';
import { getSettings, saveSettingsSection } from '../../services/schoolSettingsAPIs.js';
import { notify } from '@/components/patterns/toastBus.js';
import { DetailSkeleton } from '../../../../../components/patterns';

const CHANNELS = [
    { key: 'email', label: 'Email', hint: 'Sent through the school email service.' },
    { key: 'in_app', label: 'In-app', hint: 'Shown inside the EduConnect app.' },
    { key: 'push', label: 'Push', hint: 'Phone and desktop alerts for people who installed the app and allowed notifications.' },
    { key: 'sms', label: 'SMS', hint: 'Not connected yet.', disabled: true },
];
const CATEGORIES = [
    { key: 'attendance', label: 'Attendance', hint: 'The evening email to parents about absent or late periods (switch it on under Attendance Policy).' },
    { key: 'announcements', label: 'Announcements', hint: 'New announcements start with the channels you switch on above.' },
    { key: 'events', label: 'Events', hint: 'Notifications about holidays, exams and school events.' },
    { key: 'fees', label: 'Fees', hint: 'Fee reminders and receipts.' },
];

function Switch({ checked, onChange, label, disabled }) {
    return (
        <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-blue-600' : 'bg-gray-300'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
        </button>
    );
}

function Group({ title, items, values, onToggle }) {
    return (
        <section className="bg-white border border-gray-200 rounded-2xl px-5">
            <h2 className="text-sm font-bold text-gray-900 pt-4">{title}</h2>
            {items.map((it) => (
                <div key={it.key} className="flex items-start justify-between gap-4 py-4 border-b border-gray-100 last:border-0">
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{it.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5 max-w-md">{it.hint}</p>
                    </div>
                    <Switch checked={Boolean(values[it.key]) && !it.disabled} disabled={it.disabled} label={it.label} onChange={(v) => onToggle(it.key, v)} />
                </div>
            ))}
        </section>
    );
}

function NotificationContent() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState(null);
    const [saved, setSaved] = useState(null);

    useEffect(() => {
        let alive = true;
        getSettings()
            .then((s) => { if (alive) { setForm(s.notificationDefaults); setSaved(s.notificationDefaults); } })
            .catch((e) => alive && setError(e.message))
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, []);

    if (loading) return <DetailSkeleton />;
    if (error || !form) return <p className="text-sm text-red-600">{error || 'Could not load settings'}</p>;

    const dirty = JSON.stringify(form) !== JSON.stringify(saved);
    const toggle = (group) => (key, value) => setForm((f) => ({ ...f, [group]: { ...f[group], [key]: value } }));
    const save = async () => {
        setSaving(true);
        try {
            const next = await saveSettingsSection('notificationDefaults', form);
            setForm(next); setSaved(next);
            notify.success('Notification defaults saved.');
        } catch (e) { notify.error(e.message); } finally { setSaving(false); }
    };

    return (
        <div className="flex flex-col gap-6 max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                <p className="text-sm text-gray-500 mt-1">School-wide defaults for how people are told things. A channel or category you switch off here is skipped everywhere. Per-event settings live under <Link className="text-blue-600 font-semibold" to={ROUTES.events}>Events</Link>, and every message sent is listed in <Link className="text-blue-600 font-semibold" to={ROUTES.deliveryLogs}>Delivery Logs</Link>.</p>
            </div>
            <Group title="Channels" items={CHANNELS} values={form.channels} onToggle={toggle('channels')} />
            <Group title="What the school sends" items={CATEGORIES} values={form.categories} onToggle={toggle('categories')} />
            <div className="flex items-center gap-3">
                <button onClick={save} disabled={!dirty || saving} className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{saving ? 'Saving…' : 'Save changes'}</button>
                {dirty && <button onClick={() => setForm(saved)} className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900">Discard</button>}
            </div>
        </div>
    );
}

export default function NotificationDefaultsPage() {
    return (
        <AdminLayout>
            <SettingsBreadcrumb section="Notifications" />
            <NotificationContent />
        </AdminLayout>
    );
}
