import React, { useState, useEffect, useCallback } from 'react';
import {
  getOutstandingBalances,
  getAgingReport,
  getCollectionReport,
  formatNaira,
} from '../../services/feeAPIs.js';
import StudentLedgerModal from './StudentLedgerModal.jsx';
import {
  AlertTriangle,
  Loader2,
  Download,
  BookText,
  TrendingUp,
  CalendarClock,
} from 'lucide-react';

// ── CSV export helper (client-side, works in DEMO + live) ────────────────────
function exportCsv(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function FeeReportsTab({ classes = [], currentYear, currentTerm }) {
  const [classFilter, setClassFilter] = useState('all');
  const [loading, setLoading]         = useState(true);
  const [outstanding, setOutstanding] = useState({ students: [], totals: {} });
  const [aging, setAging]             = useState({ buckets: [] });
  const [collections, setCollections] = useState({ series: [], totalCollected: 0 });
  const [ledgerStudent, setLedger]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const scope = {
      academicYearId: currentYear?.id,
      ...(currentTerm ? { termId: currentTerm.id } : {}),
      ...(classFilter !== 'all' ? { classId: classFilter } : {}),
    };
    try {
      const [o, ag, c] = await Promise.all([
        getOutstandingBalances(scope),
        getAgingReport(scope),
        getCollectionReport(scope),
      ]);
      if (o.success)  setOutstanding(o.data);
      if (ag.success) setAging(ag.data);
      if (c.success)  setCollections(c.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentTerm, classFilter]);

  useEffect(() => { load(); }, [load]);

  const t = outstanding.totals || {};

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-gray-800">Financial Reports</h2>
        <select
          value={classFilter}
          onChange={e => setClassFilter(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
        >
          <option value="all">All classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
          <Loader2 size={18} className="animate-spin" /> Compiling reports…
        </div>
      ) : (
        <>
          {/* Aging buckets */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <CalendarClock size={16} className="text-amber-500" />
              <h3 className="text-sm font-bold text-gray-800">Arrears Aging</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {(aging.buckets || []).map(b => (
                <div key={b.range} className="border border-gray-200 rounded-lg p-4">
                  <p className="text-[11px] font-bold uppercase text-gray-400">{b.label}</p>
                  <p className="text-lg font-black text-gray-900 mt-1">{formatNaira(b.amount)}</p>
                  <p className="text-xs text-gray-500">{b.count} student(s)</p>
                </div>
              ))}
            </div>
          </div>

          {/* Collections trend */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-green-500" />
                <h3 className="text-sm font-bold text-gray-800">Collections</h3>
              </div>
              <span className="text-sm font-bold text-gray-900">
                Total: {formatNaira(collections.totalCollected)}
              </span>
            </div>
            {(collections.series || []).length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No collection data yet.</p>
            ) : (
              <div className="flex items-end gap-2 h-32">
                {collections.series.map((pt, i) => {
                  const max = Math.max(...collections.series.map(s => s.amount || 0), 1);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-green-400 rounded-t"
                        style={{ height: `${((pt.amount || 0) / max) * 100}%` }}
                        title={formatNaira(pt.amount)}
                      />
                      <span className="text-[9px] text-gray-400">{pt.label || pt.month}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Outstanding balances */}
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                <h3 className="text-sm font-bold text-gray-800">
                  Outstanding Balances ({outstanding.students?.length || 0})
                </h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-xs text-gray-500">
                  Billed <strong className="text-gray-800">{formatNaira(t.billed)}</strong> ·
                  Paid <strong className="text-green-600"> {formatNaira(t.paid)}</strong> ·
                  Owing <strong className="text-red-600"> {formatNaira(t.outstanding)}</strong>
                </div>
                <button
                  onClick={() =>
                    exportCsv('outstanding-balances.csv', outstanding.students || [])
                  }
                  disabled={!outstanding.students?.length}
                  className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Download size={13} /> Export CSV
                </button>
              </div>
            </div>

            {(outstanding.students || []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-16">
                No outstanding balances — all settled, or no invoices generated yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/50">
                    <tr className="text-[11px] uppercase text-gray-500">
                      <th className="p-4">Student</th>
                      <th className="p-4">Class</th>
                      <th className="p-4 text-right">Billed</th>
                      <th className="p-4 text-right">Paid</th>
                      <th className="p-4 text-right">Outstanding</th>
                      <th className="p-4 text-right">Days Overdue</th>
                      <th className="p-4 text-right">Ledger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {outstanding.students.map(s => (
                      <tr key={s.studentId} className="hover:bg-gray-50/50">
                        <td className="p-4 font-semibold text-gray-800">{s.studentName}</td>
                        <td className="p-4 text-gray-600">{s.className}</td>
                        <td className="p-4 text-right text-gray-700">{formatNaira(s.billed)}</td>
                        <td className="p-4 text-right text-green-600">{formatNaira(s.paid)}</td>
                        <td className="p-4 text-right font-bold text-red-600">{formatNaira(s.outstanding)}</td>
                        <td className="p-4 text-right">
                          {s.daysOverdue > 0 ? (
                            <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                              {s.daysOverdue}d
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setLedger({ id: s.studentId, name: s.studentName })}
                            className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg"
                          >
                            <BookText size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {ledgerStudent && (
        <StudentLedgerModal student={ledgerStudent} onClose={() => setLedger(null)} />
      )}
    </div>
  );
}
