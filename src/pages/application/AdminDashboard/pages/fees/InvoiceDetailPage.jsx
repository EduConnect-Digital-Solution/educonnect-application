import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Wallet, Ban, BookText, FilePlus2, CheckCircle2 } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import {
    DetailPage, EmptyState, Timeline, pushToast, ConfirmDestructiveDialog,
} from '../../../../../components/patterns/index.js';
import { getInvoiceById, voidInvoice, formatNaira } from '../../services/feeAPIs.js';
import RecordPaymentModal from '../../fees/components/RecordPaymentModal.jsx';
import StudentLedgerModal from '../../fees/components/StudentLedgerModal.jsx';
import { ROUTES } from '../../navigation/navConfig.js';

export default function InvoiceDetailPage() {
    const { invoiceId } = useParams();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [payOpen, setPayOpen] = useState(false);
    const [voidOpen, setVoidOpen] = useState(false);
    const [ledgerOpen, setLedgerOpen] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getInvoiceById(invoiceId);
            const inv = res?.data?.invoice ?? res?.data ?? null;
            if (!inv) throw new Error('Invoice not found.');
            setInvoice(inv);
        } catch (e) {
            setError(e?.message || 'Failed to load this invoice.');
        } finally {
            setLoading(false);
        }
    }, [invoiceId]);

    useEffect(() => { load(); }, [load]);

    if (!loading && error) {
        return (
            <AdminLayout>
                <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl mt-8">
                    <EmptyState variant="error" description={error} onRetry={load} />
                </div>
            </AdminLayout>
        );
    }

    const due = invoice ? (invoice.amountDue ?? (invoice.amount - (invoice.amountPaid || 0))) : 0;
    const items = invoice?.items ?? invoice?.lineItems ?? [];
    const payments = invoice?.payments ?? [];
    const canPay = invoice && invoice.status !== 'paid' && invoice.status !== 'void';

    const timelineItems = invoice ? [
        ...(payments.map(p => ({
            title: `Payment ${formatNaira(p.amount)}`, at: p.paidAt, tone: 'green', icon: CheckCircle2,
            comment: p.method ? `via ${String(p.method).replace('_', ' ')}` : undefined,
        }))),
        invoice.createdAt && { title: 'Invoice generated', at: invoice.createdAt, tone: 'blue', icon: FilePlus2 },
    ].filter(Boolean) : [];

    return (
        <AdminLayout>
            <DetailPage
                loading={loading}
                breadcrumb={[{ label: 'Finance', to: ROUTES.invoices }, { label: 'Invoices', to: ROUTES.invoices }, { label: invoice?.studentName || invoice?.studentId || '…' }]}
                avatar={{ icon: Wallet }}
                title={invoice?.studentName || invoice?.studentId}
                subtitle={invoice?.feeStructureName ? `${invoice.feeStructureName} · ${invoice.className ?? ''}` : invoice?.className}
                idLabel={invoice?.invoiceNumber ? `#${invoice.invoiceNumber}` : undefined}
                status={invoice?.status}
                primaryActions={canPay ? [{ id: 'pay', label: 'Record payment', icon: Wallet, onClick: () => setPayOpen(true) }] : []}
                overflowActions={[
                    { id: 'ledger', label: 'View student ledger', icon: BookText, onClick: () => setLedgerOpen(true) },
                    ...(invoice?.status !== 'void' ? [{ id: 'void', label: 'Void invoice', icon: Ban, destructive: true, onClick: () => setVoidOpen(true) }] : []),
                ]}
                stats={[
                    { label: 'Amount', value: formatNaira(invoice?.amount) },
                    { label: 'Paid', value: formatNaira(invoice?.amountPaid), tone: 'green' },
                    { label: 'Balance', value: formatNaira(due), tone: due > 0 ? 'red' : 'green' },
                    { label: 'Due date', value: invoice?.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—' },
                    { label: 'Status', value: invoice?.status ?? '—' },
                ]}
                tabs={[
                    {
                        id: 'items', label: 'Line items', badge: items.length || undefined,
                        content: items.length ? (
                            <div className="divide-y divide-gray-50">
                                {items.map((it, i) => (
                                    <div key={i} className="flex items-center justify-between py-2.5">
                                        <span className="text-[13px] text-gray-700">{it.name || it.feeType}</span>
                                        <span className="text-[13px] font-semibold text-gray-800">{formatNaira(it.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-[13px] text-gray-400 italic">No line-item breakdown on this invoice.</p>,
                    },
                    {
                        id: 'payments', label: 'Payments', badge: payments.length || undefined,
                        content: payments.length ? (
                            <div className="divide-y divide-gray-50">
                                {payments.map((p, i) => (
                                    <div key={p.id ?? i} className="flex items-center justify-between py-2.5">
                                        <div>
                                            <p className="text-[13px] font-semibold text-gray-800">{formatNaira(p.amount)}</p>
                                            <p className="text-[11px] text-gray-400 capitalize">{(p.method || '').replace('_', ' ')} · {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</p>
                                        </div>
                                        {p.id && (
                                            <button onClick={() => navigate(`${ROUTES.payments}/${p.id}`)}
                                                className="text-[12px] font-semibold text-blue-600 hover:underline">Receipt</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState variant="first-use" icon={Wallet} compact
                                title="No payments yet"
                                description="Record a payment to start settling this invoice."
                                action={canPay ? { label: 'Record payment', onClick: () => setPayOpen(true) } : undefined} />
                        ),
                    },
                ]}
                rail={
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Timeline</p>
                        <Timeline items={timelineItems} emptyLabel="Billing events will appear here." />
                    </div>
                }
            />

            {payOpen && (
                <RecordPaymentModal
                    invoice={invoice}
                    onClose={() => setPayOpen(false)}
                    onRecorded={() => { pushToast({ message: 'Payment recorded' }); load(); }}
                    showToast={(message, type) => pushToast({ message, type })}
                />
            )}
            {ledgerOpen && (
                <StudentLedgerModal student={{ id: invoice.studentId, name: invoice.studentName }} onClose={() => setLedgerOpen(false)} />
            )}
            <ConfirmDestructiveDialog
                open={voidOpen}
                onClose={() => setVoidOpen(false)}
                verb="Void"
                noun="invoice"
                recordName={invoice?.invoiceNumber ? `#${invoice.invoiceNumber}` : (invoice?.studentName || 'this invoice')}
                consequence="It will no longer count toward billed or outstanding totals."
                onConfirm={async (reason) => {
                    await voidInvoice(invoice.id, reason);
                    pushToast({ message: 'Invoice voided' });
                    load();
                }}
            />
        </AdminLayout>
    );
}
