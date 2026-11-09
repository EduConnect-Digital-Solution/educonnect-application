import React, { useState, useEffect } from 'react';
import { getReceipt, sendReceipt, formatNaira } from '../../services/feeAPIs.js';
import { X, Loader2, Printer, Send, CheckCircle2 } from 'lucide-react';

/**
 * ReceiptModal — render-ready digital receipt with print + email/SMS dispatch.
 * Props: { paymentId, onClose, showToast }
 */
export default function ReceiptModal({ paymentId, onClose, showToast }) {
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getReceipt(paymentId);
        if (res.success) setReceipt(res.data.receipt);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [paymentId]);

  const handleSend = async (channel) => {
    setSending(true);
    try {
      const res = await sendReceipt(paymentId, { channel });
      if (res.success) showToast(`Receipt sent via ${channel}`);
    } catch (e) {
      showToast(e.message || 'Failed to send receipt', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/30" onClick={onClose} />
        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-base font-bold text-gray-900">Payment Receipt</h3>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
              <X size={18} />
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
                <Loader2 size={16} className="animate-spin" /> Loading receipt…
              </div>
            ) : !receipt ? (
              <p className="text-sm text-gray-400 text-center py-12">
                Receipt not available (will populate once backend is live).
              </p>
            ) : (
              <div className="border border-dashed border-gray-300 rounded-xl p-5 text-sm">
                <div className="text-center border-b border-gray-100 pb-3 mb-3">
                  <p className="font-black text-gray-900">{receipt.school?.name || 'School'}</p>
                  <p className="text-[11px] text-gray-400">{receipt.school?.address}</p>
                  <p className="text-xs font-bold text-blue-600 mt-2">
                    OFFICIAL RECEIPT · {receipt.receiptNumber}
                  </p>
                </div>
                <div className="space-y-1.5 text-gray-600">
                  <div className="flex justify-between"><span>Student</span><span className="font-semibold text-gray-800">{receipt.student?.name}</span></div>
                  <div className="flex justify-between"><span>Class</span><span className="text-gray-800">{receipt.student?.className}</span></div>
                  <div className="flex justify-between"><span>Method</span><span className="text-gray-800 capitalize">{receipt.method}</span></div>
                  <div className="flex justify-between"><span>Reference</span><span className="text-gray-800">{receipt.reference}</span></div>
                  <div className="flex justify-between"><span>Date</span><span className="text-gray-800">{receipt.paidAt ? new Date(receipt.paidAt).toLocaleString() : '—'}</span></div>
                </div>
                <div className="border-t border-gray-100 mt-3 pt-3 space-y-1">
                  {(receipt.items || []).map((it, i) => (
                    <div key={i} className="flex justify-between text-gray-600">
                      <span>{it.name}</span><span>{formatNaira(it.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between font-bold text-gray-900">
                  <span>Amount Paid</span><span>{formatNaira(receipt.amountPaid)}</span>
                </div>
                <div className="flex justify-between text-xs text-red-600 mt-1">
                  <span>Balance</span><span>{formatNaira(receipt.balance)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50/50">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 flex items-center gap-2"
            >
              <Printer size={14} /> Print
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => handleSend('sms')}
                disabled={sending}
                className="px-3 py-2 text-sm font-semibold border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 flex items-center gap-1.5"
              >
                {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} SMS
              </button>
              <button
                onClick={() => handleSend('email')}
                disabled={sending}
                className="px-3 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {sending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Email
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
