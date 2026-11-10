import React, { useState, useEffect, useCallback } from 'react';
import { MailCheck, RefreshCw, Loader2 } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import { EmptyState } from '../../../../../components/patterns';
import { getNotificationLogs } from '../../timetable/timetableAPIs.js';

const STATUS_TONE = {
    sent:    'bg-green-50 text-green-700',
    failed:  'bg-red-50 text-red-700',
    pending: 'bg-amber-50 text-amber-700',
};
const CHANNELS = [['', 'All channels'], ['email', 'Email'], ['sms', 'SMS'], ['push', 'Push'], ['in_app', 'In-app']];
const STATUSES = [['', 'All statuses'], ['sent', 'Sent'], ['failed', 'Failed'], ['pending', 'Pending']];

const formatWhen = (value) => {
    if (!value) return '—';
    return new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const selectClass = 'px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300';

export default function DeliveryLogsPage() {
    const [status, setStatus]   = useState('');
    const [channel, setChannel] = useState('');
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const res = await getNotificationLogs(undefined, status || undefined, channel || undefined);
            setData(res.data);
        } catch (e) {
            setError(e?.response?.data?.error?.message || e?.response?.data?.message || 'Could not load delivery logs.');
        } finally {
            setLoading(false);
        }
    }, [status, channel]);

    useEffect(() => { load(); }, [load]);

    const logs = data?.logs ?? [];
    const filtered = Boolean(status || channel);

    return (
        <AdminLayout>
            <div className="flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <MailCheck size={20} className="text-purple-600" /> Delivery Logs
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Confirm that the messages the school sent actually arrived. Failed messages show the reason.
                        </p>
                    </div>
                    <button type="button" onClick={load} disabled={loading}
                        className="self-start flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>

                {data && (
                    <div className="grid grid-cols-3 gap-3">
                        {[['Messages logged', data.total], ['Failed', data.failed], ['Delivery rate', data.total ? `${Math.round(((data.total - data.failed) / data.total) * 100)}%` : '—']].map(([label, value]) => (
                            <div key={label} className="bg-white border border-gray-200 rounded-2xl p-4">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{label}</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap gap-3">
                    <label className="sr-only" htmlFor="log-status">Status</label>
                    <select id="log-status" value={status} onChange={e => setStatus(e.target.value)} className={selectClass}>
                        {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <label className="sr-only" htmlFor="log-channel">Channel</label>
                    <select id="log-channel" value={channel} onChange={e => setChannel(e.target.value)} className={selectClass}>
                        {CHANNELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
                )}

                {!loading && error && (
                    <div className="bg-white border border-gray-200 rounded-2xl">
                        <EmptyState variant="error" description={error} onRetry={load} />
                    </div>
                )}

                {!loading && !error && logs.length === 0 && (
                    <div className="bg-white border border-gray-200 rounded-2xl">
                        <EmptyState
                            variant={filtered ? 'filtered' : 'first-use'}
                            title={filtered ? 'No messages match these filters' : 'No messages sent yet'}
                            description={filtered
                                ? 'Try a different status or channel.'
                                : 'Messages appear here once an event notice or announcement has been sent.'}
                        />
                    </div>
                )}

                {!loading && !error && logs.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-100">
                                    <th className="px-4 py-3 font-semibold">Recipient</th>
                                    <th className="px-4 py-3 font-semibold">Message</th>
                                    <th className="px-4 py-3 font-semibold">Channel</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                    <th className="px-4 py-3 font-semibold">When</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(l => (
                                    <tr key={l.id} className="border-b border-gray-50 last:border-0 align-top">
                                        <td className="px-4 py-3 font-medium text-gray-900">{l.recipientName}</td>
                                        <td className="px-4 py-3 text-gray-700">{l.eventTitle || '—'}</td>
                                        <td className="px-4 py-3 text-gray-700 capitalize">{String(l.channel).replace('_', '-')}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_TONE[l.status] || 'bg-gray-100 text-gray-600'}`}>
                                                {l.status}
                                            </span>
                                            {l.errorMessage && <span className="block text-xs text-red-600 mt-1">{l.errorMessage}</span>}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatWhen(l.sentAt || l.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
