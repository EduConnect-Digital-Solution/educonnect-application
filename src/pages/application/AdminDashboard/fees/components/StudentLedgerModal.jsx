import React, { useState, useEffect } from 'react';
import { useAcademic } from '../../../../../contexts/AcademicContext.jsx';
import { getStudentLedger, formatNaira } from '../../services/feeAPIs.js';
import { X, Loader2, ArrowDownCircle, ArrowUpCircle, SlidersHorizontal } from 'lucide-react';

const typeMeta = {
  debit:      { icon: ArrowUpCircle,    color: 'text-red-500',    label: 'Bill' },
  credit:     { icon: ArrowDownCircle,  color: 'text-green-600',  label: 'Payment' },
  adjustment: { icon: SlidersHorizontal, color: 'text-violet-600', label: 'Adjustment' },
};

/**
 * StudentLedgerModal — double-entry transaction trail with running balance.
 * Props: { student: { id, name }, onClose }
 */
export default function StudentLedgerModal({ student, onClose }) {
  const { currentYear, currentTerm } = useAcademic();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getStudentLedger(student.id, {
          academicYearId: currentYear?.id,
          termId: currentTerm?.id,
        });
        if (res.success) setData(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.id]);

  const entries = data?.entries || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/30" onClick={onClose} />
        <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[85vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h3 className="text-base font-bold text-gray-900">Student Ledger</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {student.name || student.id} — double-entry transaction trail
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                <Loader2 size={16} className="animate-spin" /> Loading ledger…
              </div>
            ) : entries.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-16">
                No ledger entries for this student in the selected scope.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-[11px] uppercase font-bold text-gray-400">Opening</p>
                    <p className="text-sm font-bold text-gray-800">{formatNaira(data.openingBalance)}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-[11px] uppercase font-bold text-gray-400">Entries</p>
                    <p className="text-sm font-bold text-gray-800">{entries.length}</p>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                    <p className="text-[11px] uppercase font-bold text-red-400">Closing Balance</p>
                    <p className="text-sm font-bold text-red-600">{formatNaira(data.closingBalance)}</p>
                  </div>
                </div>

                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase text-gray-400 border-b border-gray-200">
                      <th className="py-2 pr-2">Date</th>
                      <th className="py-2 px-2">Description</th>
                      <th className="py-2 px-2 text-right">Debit</th>
                      <th className="py-2 px-2 text-right">Credit</th>
                      <th className="py-2 pl-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {entries.map((e, i) => {
                      const m = typeMeta[e.type] || typeMeta.debit;
                      return (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="py-2.5 pr-2 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(e.date).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2">
                              <m.icon size={14} className={m.color} />
                              <span className="text-gray-700">{e.description}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right text-red-600">
                            {e.debit ? formatNaira(e.debit) : '—'}
                          </td>
                          <td className="py-2.5 px-2 text-right text-green-600">
                            {e.credit ? formatNaira(e.credit) : '—'}
                          </td>
                          <td className="py-2.5 pl-2 text-right font-semibold text-gray-800">
                            {formatNaira(e.balance)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
