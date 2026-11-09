import React, { useEffect, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { getMyReceipt } from './services/parentFeeAPIs.js';

const money = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');
const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const label = (s) => String(s || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) || '—';

/** Printable receipt for one payment. Prints only the receipt (see the print styles). */
export default function ReceiptModal({ paymentId, onClose }) {
    const [receipt, setReceipt] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let alive = true;
        getMyReceipt(paymentId)
            .then((r) => alive && setReceipt(r))
            .catch((e) => alive && setError(e.message || 'Could not load the receipt.'));
        return () => { alive = false; };
    }, [paymentId]);

    const rows = receipt ? [
        ['Student', receipt.studentInfo?.name],
        ['Class', receipt.studentInfo?.className],
        ['Payment method', label(receipt.method)],
        ['Reference', receipt.reference],
        ['Date paid', fmt(receipt.paidAt)],
    ].filter(([, v]) => v) : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Payment receipt">
            <style>{`@media print {
                body * { visibility: hidden !important; }
                #parent-receipt-print, #parent-receipt-print * { visibility: visible !important; }
                #parent-receipt-print { position: absolute; inset: 0; box-shadow: none !important; }
                .no-print { display: none !important; }
            }`}</style>

            <div id="parent-receipt-print" className="w-full max-w-md bg-white rounded-xl shadow-xl p-6">
                <div className="no-print flex justify-end -mt-2 -mr-2 mb-1">
                    <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"><X size={18} /></button>
                </div>

                {!receipt && !error && <p className="py-10 text-center text-gray-500">Loading receipt…</p>}
                {error && <p className="py-10 text-center text-red-600">{error}</p>}

                {receipt && (
                    <>
                        <div className="text-center pb-4 border-b border-gray-200">
                            {receipt.schoolInfo?.logoUrl && (
                                <img src={receipt.schoolInfo.logoUrl} alt="" className="w-14 h-14 rounded-lg object-cover mx-auto mb-2" />
                            )}
                            <h2 className="text-lg font-bold text-gray-900">{receipt.schoolInfo?.name}</h2>
                            {receipt.schoolInfo?.address && <p className="text-xs text-gray-500 mt-0.5">{receipt.schoolInfo.address}</p>}
                            <p className="mt-3 text-xs font-semibold tracking-wider uppercase text-gray-500">Payment receipt</p>
                            <p className="font-mono text-sm text-gray-900">{receipt.receiptNumber}</p>
                        </div>

                        <dl className="py-4 space-y-2 text-sm">
                            {rows.map(([k, v]) => (
                                <div key={k} className="flex justify-between gap-4">
                                    <dt className="text-gray-500">{k}</dt>
                                    <dd className="text-gray-900 font-medium text-right break-all">{v}</dd>
                                </div>
                            ))}
                        </dl>

                        <div className="pt-3 border-t border-gray-200 space-y-1.5">
                            <div className="flex justify-between"><span className="text-gray-500">Amount paid</span><span className="text-xl font-bold text-gray-900">{money(receipt.amountPaid)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-500">Balance remaining</span><span className="text-gray-900">{money(receipt.balance)}</span></div>
                        </div>

                        <button onClick={() => window.print()} className="no-print mt-5 w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
                            <Printer size={16} /> Print / save as PDF
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
