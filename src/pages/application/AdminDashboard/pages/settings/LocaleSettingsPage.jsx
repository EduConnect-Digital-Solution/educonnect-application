import React, { useEffect, useMemo, useState } from 'react';
import { Info, Lock } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import SettingsBreadcrumb from '../../components/ui/SettingsBreadcrumb.jsx';
import { getSettings, getLocaleLock, saveSettingsSection } from '../../services/schoolSettingsAPIs.js';
import { setSchoolLocale, formatMinor, formatSchoolDate } from '../../../../../utils/schoolLocale.js';
import { notify } from '@/components/patterns/toastBus.js';
import { DetailSkeleton } from '../../../../../components/patterns';

const CURRENCY_NAMES = {
    NGN: 'Nigerian naira (₦)', GHS: 'Ghanaian cedi (GH₵)', KES: 'Kenyan shilling (KSh)', ZAR: 'South African rand (R)',
    USD: 'US dollar ($)', GBP: 'British pound (£)', EUR: 'Euro (€)',
};
const LOCALE_NAMES = { 'en-NG': 'English (Nigeria)', 'en-GH': 'English (Ghana)', 'en-KE': 'English (Kenya)', 'en-ZA': 'English (South Africa)', 'en-US': 'English (United States)', 'en-GB': 'English (United Kingdom)' };
const FORMAT_LABEL = { 'DD/MM/YYYY': '31/12/2026', 'MM/DD/YYYY': '12/31/2026', 'YYYY-MM-DD': '2026-12-31', 'D MMM YYYY': '31 Dec 2026' };

const fieldClass = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 disabled:bg-gray-50 disabled:text-gray-400';

const timezones = () => {
    let all = [];
    try { all = Intl.supportedValuesOf('timeZone'); } catch { all = []; }
    const africa = all.filter((z) => z.startsWith('Africa/'));
    const common = ['UTC', 'Europe/London', 'America/New_York', 'Asia/Dubai'];
    return [...new Set([...(africa.length ? africa : ['Africa/Lagos', 'Africa/Accra', 'Africa/Nairobi', 'Africa/Johannesburg']), ...common.filter((z) => all.length === 0 || all.includes(z))])];
};

function LocaleContent() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState(null);
    const [saved, setSaved] = useState(null);
    const [options, setOptions] = useState({ currencies: [], dateFormats: [], locales: [] });
    const [locked, setLocked] = useState(false);
    const zones = useMemo(timezones, []);

    useEffect(() => {
        let alive = true;
        Promise.all([getSettings(), getLocaleLock()])
            .then(([s, lock]) => { if (!alive) return; setForm(s.locale); setSaved(s.locale); setOptions(s.options); setLocked(lock); })
            .catch((e) => alive && setError(e.message))
            .finally(() => alive && setLoading(false));
        return () => { alive = false; };
    }, []);

    if (loading) return <DetailSkeleton />;
    if (error || !form) return <p className="text-sm text-red-600">{error || 'Could not load settings'}</p>;

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const dirty = JSON.stringify(form) !== JSON.stringify(saved);

    // Preview with the form values, not the saved ones
    const preview = new Intl.NumberFormat(form.locale, { style: 'currency', currency: form.currency, maximumFractionDigits: 0 }).format(125000);

    const save = async () => {
        setSaving(true);
        try {
            const patch = { ...form };
            if (locked) delete patch.currency; // locked: only the other fields are sent
            const next = await saveSettingsSection('locale', patch);
            setForm(next); setSaved(next); setSchoolLocale(next);
            notify.success('Locale settings saved.');
        } catch (e) {
            notify.error(e.message);
        } finally { setSaving(false); }
    };

    return (
        <div className="flex flex-col gap-6 max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Locale</h1>
                <p className="text-sm text-gray-500 mt-1">Currency, timezone and date format used across fees, receipts, reports and the parent portal.</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-5">
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Currency</span>
                    <select className={fieldClass} value={form.currency} onChange={set('currency')} disabled={locked}>
                        {options.currencies.map((c) => <option key={c} value={c}>{c} · {CURRENCY_NAMES[c] || c}</option>)}
                    </select>
                    {locked && (
                        <span className="flex items-start gap-1.5 text-xs text-amber-700"><Lock size={12} className="mt-0.5 shrink-0" />The currency is locked because this school already has invoices or payments. Changing it would relabel old amounts. Contact support if it must change.</span>
                    )}
                    {!locked && form.currency !== 'NGN' && (
                        <span className="flex items-start gap-1.5 text-xs text-gray-500"><Info size={12} className="mt-0.5 shrink-0" />Online card and transfer payments are processed by your payment provider. Make sure your account there accepts {form.currency} before collecting fees. Once the first invoice is created the currency can no longer be changed.</span>
                    )}
                </label>

                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Number and language format</span>
                    <select className={fieldClass} value={form.locale} onChange={set('locale')}>
                        {options.locales.map((l) => <option key={l} value={l}>{LOCALE_NAMES[l] || l}</option>)}
                    </select>
                </label>

                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Timezone</span>
                    <select className={fieldClass} value={form.timezone} onChange={set('timezone')}>
                        {[...new Set([form.timezone, ...zones])].map((z) => <option key={z} value={z}>{z.replace('_', ' ')}</option>)}
                    </select>
                    <span className="text-xs text-gray-500">Also decides when the evening attendance email goes out.</span>
                </label>

                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date format</span>
                    <select className={fieldClass} value={form.dateFormat} onChange={set('dateFormat')}>
                        {options.dateFormats.map((d) => <option key={d} value={d}>{FORMAT_LABEL[d] || d}</option>)}
                    </select>
                </label>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Preview</p>
                <p className="text-sm text-gray-800">A fee of <b>{preview}</b> due on <b>{formatSchoolDate('2026-12-31T12:00:00Z') && FORMAT_LABEL[form.dateFormat]}</b></p>
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

export default function LocaleSettingsPage() {
    return (
        <AdminLayout>
            <SettingsBreadcrumb section="Locale" />
            <LocaleContent />
        </AdminLayout>
    );
}
