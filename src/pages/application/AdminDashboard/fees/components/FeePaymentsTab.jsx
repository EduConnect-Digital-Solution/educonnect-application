import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllPayments, applyAdjustment, formatNaira, toKobo,
  PAYMENT_METHODS, ADJUSTMENT_TYPES,
} from '../../services/feeAPIs.js';
import StudentLedgerModal from './StudentLedgerModal.jsx';
import { Search, Loader2, Wallet, BookText, SlidersHorizontal, X } from 'lucide-react';
import { WorkbenchTable, pushToast } from '../../../../../components/patterns';
import { ROUTES } from '../../navigation/navConfig.js';

// ─── Adjustment modal (discount / waiver / scholarship / correction) ──────────
function AdjustmentModal({ onClose, onApplied }) {
  const [studentId, setStudentId] = useState('');
  const [type, setType]           = useState('discount');
  const [amount, setAmount]       = useState('');
  const [reason, setReason]       = useState('');
  const [busy, setBusy]           = useState(false);

  const submit = async () => {
    if (!studentId.trim()) return pushToast({ message: 'Student ID is required' });
    if (!amount || Number(amount) <= 0) return pushToast({ message: 'Enter a valid amount' });
    if (!reason.trim()) return pushToast({ message: 'A reason is required for the audit trail' });
    setBusy(true);
    try {
      const res = await applyAdjustment({ studentId: studentId.trim(), type, amount: toKobo(amount), reason: reason.trim(), approvedBy: 'admin' });
      if (res.success) { onApplied?.(res.data.adjustment); pushToast({ message: 'Adjustment applied to ledger' }); onClose(); }
    } catch (e) {
      pushToast({ message: e.message || 'Failed to apply adjustment' });
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/30" onClick={onClose} />
        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-base font-bold text-gray-900">Apply Adjustment</h3>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Student ID</label>
              <input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="stu_…"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 outline-none">
                {ADJUSTMENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Amount (₦)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Reason (audit)</label>
              <textarea rows={2} value={reason} onChange={e => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none" />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50/50">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100">Cancel</button>
            <button onClick={submit} disabled={busy}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {busy && <Loader2 size={14} className="animate-spin" />} Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * FeePaymentsTab — migrated onto WorkbenchTable. Rows open the Payment detail
 * page (receipt). Ledger lookup and adjustments remain as operations here.
 */
export default function FeePaymentsTab({ currentYear }) {
  const navigate = useNavigate();
  const [payments, setPayments]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [lookup, setLookup]       = useState('');
  const [ledgerStudent, setLedger] = useState(null);
  const [showAdjust, setShowAdjust] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllPayments({ academicYearId: currentYear?.id });
      if (res.success) setPayments(res.data.payments || []);
    } catch (e) {
      console.error(e);
      setError(e?.message || 'Failed to load payments.');
    } finally {
      setLoading(false);
    }
  }, [currentYear]);

  useEffect(() => { load(); }, [load]);

  const columns = useMemo(() => [
    { id: 'receipt', header: 'Receipt', accessor: r => r.receiptNumber, sortable: true, render: r => <span className="font-mono text-xs text-gray-600">{r.receiptNumber}</span> },
    { id: 'student', header: 'Student', accessor: r => r.studentName || r.studentId, sortable: true, render: r => <span className="text-gray-700">{r.studentName || r.studentId}</span> },
    { id: 'method', header: 'Method', accessor: r => r.paymentMethod, render: r => <span className="capitalize text-gray-600">{(r.paymentMethod || '').replace('_', ' ')}</span> },
    { id: 'amount', header: 'Amount', accessor: r => r.amount, sortable: true, align: 'right', render: r => <span className="font-semibold text-green-600">{formatNaira(r.amount)}</span> },
    { id: 'date', header: 'Date', accessor: r => r.paidAt, sortable: true, render: r => <span className="text-xs text-gray-500">{r.paidAt ? new Date(r.paidAt).toLocaleDateString() : '—'}</span> },
  ], []);

  const filters = useMemo(() => [
    { id: 'method', label: 'Method', getValue: r => r.paymentMethod, options: PAYMENT_METHODS.map(m => ({ value: m.id, label: m.label })) },
  ], []);

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Look up Student Ledger</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input value={lookup} onChange={e => setLookup(e.target.value)} placeholder="Enter student ID…"
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <button onClick={() => lookup.trim() && setLedger({ id: lookup.trim(), name: lookup.trim() })}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-black flex items-center gap-2">
              <BookText size={15} /> View Ledger
            </button>
          </div>
        </div>
        <button onClick={() => setShowAdjust(true)}
          className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 flex items-center gap-2">
          <SlidersHorizontal size={15} /> Apply Adjustment
        </button>
      </div>

      <WorkbenchTable
        title="Payments"
        storageKey="fee-payments"
        loading={loading}
        error={error}
        onRetry={load}
        rows={payments}
        columns={columns}
        filters={filters}
        searchPlaceholder="Search receipt or student…"
        searchKeys={['receiptNumber', 'studentName', 'studentId']}
        onRowClick={(r) => navigate(`${ROUTES.payments}/${r.id}`)}
        emptyState={{
          icon: Wallet,
          title: 'No payments recorded yet',
          description: 'Recorded and gateway payments will stream here for reconciliation.',
        }}
      />

      {ledgerStudent && <StudentLedgerModal student={ledgerStudent} onClose={() => setLedger(null)} />}
      {showAdjust && <AdjustmentModal onClose={() => setShowAdjust(false)} onApplied={load} />}
    </div>
  );
}
