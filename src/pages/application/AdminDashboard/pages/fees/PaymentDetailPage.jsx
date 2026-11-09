import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Receipt, Send, CheckCircle2 } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import { DetailPage, EmptyState, Timeline, pushToast } from '../../../../../components/patterns/index.js';
import { getReceipt, sendReceipt, formatNaira } from '../../services/feeAPIs.js';
import { ROUTES } from '../../navigation/navConfig.js';

export default function PaymentDetailPage() {
    const { paymentId } = useParams();
    const [receipt, setReceipt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sending, setSending] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getReceipt(paymentId);
            const r = res?.data?.receipt;
            if (!r) throw new Error('Receipt not found for this payment.');
            setReceipt(r);
        } catch (e) {
            setError(e?.message || 'Failed to load this payment.');
        } finally {
            setLoading(false);
        }
    }, [paymentId]);

    useEffect(() => { load(); }, [load]);

    const handleSend = async (channel) => {
        setSending(true);
        try {
            await sendReceipt(paymentId, { channel });
            pushToast({ message: `Receipt sent by ${channel}` });
        } catch (e) {
            pushToast({ message: e?.message || 'Failed to send receipt' });
        } finally {
            setSending(false);
        }
    };

    if (!loading && error) {
        return (
            <AdminLayout>
                <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl mt-8">
                    <EmptyState variant="error" description={error} onRetry={load} />
                </div>
            </AdminLayout>
        );
    }

    const items = receipt?.items ?? [];

    return (
        <AdminLayout>
            <DetailPage
                loading={loading}
                breadcrumb={[{ label: 'Finance', to: ROUTES.payments }, { label: 'Payments', to: ROUTES.payments }, { label: receipt?.receiptNumber ?? '…' }]}
                avatar={{ icon: Receipt, tone: 'green' }}
                title={receipt?.student?.name ?? 'Payment'}
                subtitle={receipt?.student?.className}
                idLabel={receipt?.receiptNumber}
                status="paid"
                primaryActions={[
                    { id: 'print', label: 'Print', icon: Receipt, variant: 'outline', onClick: () => window.print() },
                ]}
                overflowActions={[
                    { id: 'email', label: sending ? 'Sending…' : 'Send by email', icon: Send, onClick: () => handleSend('email') },
                    { id: 'sms', label: sending ? 'Sending…' : 'Send by SMS', icon: Send, onClick: () => handleSend('sms') },
                ]}
                stats={[
                    { label: 'Amount paid', value: formatNaira(receipt?.amountPaid), tone: 'green' },
                    { label: 'Balance', value: formatNaira(receipt?.balance), tone: receipt?.balance > 0 ? 'red' : 'green' },
                    { label: 'Method', value: receipt?.method ? String(receipt.method).replace('_', ' ') : '—' },
                    { label: 'Reference', value: receipt?.reference || '—' },
                    { label: 'Paid', value: receipt?.paidAt ? new Date(receipt.paidAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—' },
                ]}
                tabs={[
                    {
                        id: 'breakdown', label: 'Allocation', badge: items.length || undefined,
                        content: items.length ? (
                            <div className="divide-y divide-gray-50">
                                {items.map((it, i) => (
                                    <div key={i} className="flex items-center justify-between py-2.5">
                                        <span className="text-[13px] text-gray-700">{it.name}</span>
                                        <span className="text-[13px] font-semibold text-gray-800">{formatNaira(it.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-[13px] text-gray-400 italic">No allocation breakdown on this receipt.</p>,
                    },
                ]}
                rail={
                    <div className="space-y-5">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Issued by</p>
                            <p className="text-[13px] font-semibold text-gray-800">{receipt?.issuedBy || '—'}</p>
                        </div>
                        <div className="pt-4 border-t border-gray-100">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Timeline</p>
                            <Timeline items={receipt?.paidAt ? [{ title: `Payment received — ${formatNaira(receipt.amountPaid)}`, at: receipt.paidAt, tone: 'green', icon: CheckCircle2 }] : []} emptyLabel="Payment events will appear here." />
                        </div>
                    </div>
                }
            />
        </AdminLayout>
    );
}
