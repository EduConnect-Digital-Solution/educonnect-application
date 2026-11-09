import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReceiptText,
  Plus,
  Ban,
  Wallet,
  Eye,
  Loader2,
  X,
  Search,
  UserCheck,
  Check,
} from 'lucide-react';
import {
  formatNaira,
  INVOICE_STATUS,
  generateInvoicesForClass,
  createInvoices,
  voidInvoice,
} from '../../services/feeAPIs.js';
import { getAllStudents } from '../../../../auth/authAPIs.js';
import { WorkbenchTable, StatusChip, pushToast } from '../../../../../components/patterns';
import { ROUTES } from '../../navigation/navConfig.js';
import RecordPaymentModal from './RecordPaymentModal.jsx';

const StatCard = ({ title, value, tint, text }) => (
  <div className={`${tint} rounded-2xl p-5 flex flex-col justify-center items-center text-center`}>
    <p className={`text-sm font-medium mb-1 ${text}`}>{title}</p>
    <h2 className="text-3xl font-bold text-gray-900">{value}</h2>
  </div>
);

// ─── Student Autocomplete Search Component ─────────────
function StudentAutocomplete({ selectedStudent, onSelectStudent, classes = [] }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const classMap = useMemo(() => {
    const map = {};
    classes.forEach(c => { if (c?.id) map[c.id] = c.name; });
    return map;
  }, [classes]);

  useEffect(() => {
    let isMounted = true;
    async function loadStudents() {
      try {
        setLoading(true);
        const res = await getAllStudents();
        if (isMounted) {
          const list = res.data?.students || res.students || [];
          setAllStudents(list.map(s => {
            const fullName = s.fullName || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Unnamed Student';
            const clsName = classMap[s.classId] || s.className || 'Unassigned';
            return {
              id: s.id,
              name: fullName,
              email: s.email || '',
              admissionNumber: s.admissionNumber || s.rollNumber || '',
              className: clsName,
            };
          }));
        }
      } catch (err) {
        console.error('Failed to load students for fee invoice generation:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadStudents();
    return () => { isMounted = false; };
  }, [classMap]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  const filteredStudents = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return allStudents.slice(0, 10);
    return allStudents.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      String(s.admissionNumber).toLowerCase().includes(q) ||
      s.className.toLowerCase().includes(q)
    ).slice(0, 15);
  }, [allStudents, debouncedQuery]);

  if (selectedStudent) {
    return (
      <div>
        <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Selected Student *</label>
        <div className="flex items-center justify-between p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {selectedStudent.name.charAt(0)}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">{selectedStudent.name}</p>
              <p className="text-[11px] text-blue-700">
                Class: {selectedStudent.className} {selectedStudent.email ? `• ${selectedStudent.email}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectStudent(null)}
            className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Search Student by Name or Admission No *</label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Type student name, email, or admission no…"
          className="w-full px-3 py-2 pl-9 pr-8 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
        />
        <Search size={16} className="absolute left-3 top-2.5 text-gray-400 pointer-events-none" />
        {loading && (
          <div className="absolute right-2.5 top-2.5">
            <Loader2 size={16} className="animate-spin text-blue-600" />
          </div>
        )}
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-gray-100 animate-in fade-in duration-100">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((stu) => (
                <button
                  key={stu.id}
                  type="button"
                  onClick={() => {
                    onSelectStudent(stu);
                    setIsOpen(false);
                  }}
                  className="w-full p-2.5 text-left hover:bg-blue-50/60 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gray-100 group-hover:bg-blue-100 text-gray-700 group-hover:text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {stu.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800 group-hover:text-blue-900">{stu.name}</p>
                      <p className="text-[10px] text-gray-400">
                        Class: {stu.className} {stu.email ? `• ${stu.email}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-400 group-hover:text-blue-600 bg-gray-50 group-hover:bg-blue-100/50 px-1.5 py-0.5 rounded">
                    Select
                  </span>
                </button>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-gray-400">
                {loading ? 'Loading students…' : 'No students found matching your search.'}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Generate & Issue Invoices Modal ─────────────────
function GenerateInvoicesModal({ structures = [], classes = [], onClose, onGenerated }) {
  const [mode, setMode] = useState('class'); // 'class' | 'student'
  const [structureId, setStructureId] = useState('');
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedOptional, setSelectedOptional] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const selectedStructure = structures.find(s => s.id === structureId);

  const toggleOptional = (feeType) => {
    setSelectedOptional(prev =>
      prev.includes(feeType) ? prev.filter(t => t !== feeType) : [...prev, feeType]
    );
  };

  const handleGenerateClass = async () => {
    if (!structureId) return pushToast({ message: 'Select a published fee structure', type: 'error' });
    if (!classId) return pushToast({ message: 'Select a class', type: 'error' });

    setSubmitting(true);
    try {
      const res = await generateInvoicesForClass({
        feeStructureId: structureId,
        classId,
        includeOptional: selectedOptional,
      });
      if (res.success) {
        const count = res.data?.generated ?? 0;
        const skipped = res.data?.skipped ?? 0;
        pushToast({
          message: `Generated ${count} invoice(s)` + (skipped ? ` (${skipped} already billed, skipped)` : ''),
        });
        onGenerated?.();
        onClose();
      } else {
        pushToast({ message: res.message || 'Invoice generation failed', type: 'error' });
      }
    } catch (e) {
      pushToast({ message: e.message || 'Failed to generate invoices', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateStudentInvoice = async () => {
    if (!structureId) return pushToast({ message: 'Select a fee structure', type: 'error' });
    const targetStudentId = selectedStudent?.id || studentId.trim();
    if (!targetStudentId) return pushToast({ message: 'Please select a student', type: 'error' });

    setSubmitting(true);
    try {
      const res = await createInvoices({
        invoices: [{ feeStructureId: structureId, studentId: targetStudentId }],
      });
      if (res.success) {
        pushToast({ message: `Invoice created successfully for ${selectedStudent?.name || 'student'}` });
        onGenerated?.();
        onClose();
      } else {
        pushToast({ message: res.message || 'Invoice creation failed', type: 'error' });
      }
    } catch (e) {
      pushToast({ message: e.message || 'Failed to create invoice', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={() => !submitting && onClose()} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 border border-gray-100 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <ReceiptText size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Generate & Issue Invoices</h3>
              <p className="text-xs text-gray-500">Bill entire classes or issue custom student invoices</p>
            </div>
          </div>
          <button onClick={onClose} disabled={submitting} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-5">
          <button
            onClick={() => setMode('class')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              mode === 'class' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Class Bulk Billing
          </button>
          <button
            onClick={() => setMode('student')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              mode === 'student' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Custom Student Invoice
          </button>
        </div>

        <div className="space-y-4">
          {/* Structure Selector */}
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Published Fee Structure *</label>
            <select
              value={structureId}
              onChange={(e) => {
                setStructureId(e.target.value);
                const st = structures.find(s => s.id === e.target.value);
                if (st?.classId) setClassId(st.classId);
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              <option value="">Select published fee structure…</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.className || 'General'}) — {formatNaira(s.totalAmount)}
                </option>
              ))}
            </select>
            {structures.length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1">
                ⚠️ No published fee structures found for this scope. Publish a structure first.
              </p>
            )}
          </div>

          {mode === 'class' ? (
            <>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Target Class *</label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  <option value="">Select class…</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Optional Fee Components */}
              {selectedStructure?.items?.some(i => i.optional) && (
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase mb-1.5 block">Include Optional Items</label>
                  <div className="space-y-1.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    {selectedStructure.items.filter(i => i.optional).map((opt, idx) => (
                      <label key={idx} className="flex items-center justify-between text-xs text-gray-700 select-none cursor-pointer">
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedOptional.includes(opt.feeType)}
                            onChange={() => toggleOptional(opt.feeType)}
                            className="rounded text-blue-600"
                          />
                          {opt.name}
                        </span>
                        <span className="font-semibold">{formatNaira(opt.amount)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <StudentAutocomplete
              selectedStudent={selectedStudent}
              onSelectStudent={(stu) => {
                setSelectedStudent(stu);
                setStudentId(stu ? stu.id : '');
              }}
              classes={classes}
            />
          )}

          <div className="pt-3 flex gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={mode === 'class' ? handleGenerateClass : handleCreateStudentInvoice}
              disabled={submitting || !structureId || (mode === 'class' ? !classId : !studentId)}
              className="flex-1 px-4 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Processing…' : mode === 'class' ? 'Generate for Class' : 'Create Invoice'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Void Invoice Modal ─────────────────
function VoidInvoiceModal({ invoice, onClose, onVoided }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return pushToast({ message: 'Reason is required for voiding', type: 'error' });

    setSubmitting(true);
    try {
      const res = await voidInvoice(invoice.id, reason.trim());
      if (res.success) {
        pushToast({ message: 'Invoice voided successfully' });
        onVoided?.();
        onClose();
      } else {
        pushToast({ message: res.message || 'Failed to void invoice', type: 'error' });
      }
    } catch (e) {
      pushToast({ message: e.message || 'Failed to void invoice', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={() => !submitting && onClose()} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-gray-100 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 border border-red-200 mx-auto mb-4">
          <Ban size={22} className="text-red-600" />
        </div>

        <h3 className="text-base font-bold text-gray-900 text-center mb-1">Void Invoice?</h3>
        <p className="text-sm text-gray-600 text-center mb-1">
          You are about to soft-cancel invoice for:
        </p>
        <p className="text-sm font-semibold text-gray-800 text-center mb-4">
          &ldquo;{invoice.studentName || invoice.studentId}&rdquo; ({formatNaira(invoice.amount)})
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Reason for Voiding *</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Student transferred out / duplicate billing"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none resize-none"
              required
            />
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            ℹ️ Voiding posts a reversing entry to the ledger and marks the invoice as void.
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? 'Voiding…' : 'Void Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * FeeInvoicesTab — WorkbenchTable invoice management with bulk generation, custom creation,
 * payment recording, and voiding.
 */
export default function FeeInvoicesTab({
  classes = [],
  structures = [],
  invoices = [],
  summary = {},
  onInvoicesUpdated,
}) {
  const navigate = useNavigate();
  const [generateModal, setGenerateModal] = useState(false);
  const [payInvoiceModal, setPayInvoiceModal] = useState(null);
  const [voidInvoiceModal, setVoidInvoiceModal] = useState(null);

  const classOptions = useMemo(
    () => classes.map(c => ({ value: c.id, label: c.name })),
    [classes]
  );

  const columns = useMemo(() => [
    {
      id: 'student', header: 'Student', accessor: r => r.studentName || r.studentId, sortable: true, hideable: false,
      render: r => (
        <div>
          <p className="font-semibold text-gray-800">{r.studentName || r.studentId}</p>
          <p className="text-xs text-gray-400">{r.className}</p>
        </div>
      ),
    },
    { id: 'structure', header: 'Structure', accessor: r => r.feeStructureName || '—', render: r => <span className="text-gray-600">{r.feeStructureName || '—'}</span> },
    { id: 'amount', header: 'Amount', accessor: r => r.amount, sortable: true, align: 'right', render: r => <span className="text-gray-700">{formatNaira(r.amount)}</span> },
    { id: 'paid', header: 'Paid', accessor: r => r.amountPaid, align: 'right', render: r => <span className="text-green-600">{formatNaira(r.amountPaid)}</span> },
    {
      id: 'due', header: 'Due', accessor: r => r.amountDue ?? (r.amount - (r.amountPaid || 0)), sortable: true, align: 'right',
      render: r => <span className="font-semibold text-red-600">{formatNaira(r.amountDue ?? (r.amount - (r.amountPaid || 0)))}</span>,
    },
    { id: 'status', header: 'Status', accessor: r => r.status, sortable: true, render: r => <StatusChip status={r.status} /> },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      hideable: false,
      render: r => {
        const canPay = r.status !== 'paid' && r.status !== 'void';
        const canVoid = r.status !== 'void' && (r.amountPaid === 0 || !r.amountPaid);
        return (
          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => navigate(`${ROUTES.invoices}/${r.id}`)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="View Invoice"
            >
              <Eye size={14} />
            </button>
            {canPay && (
              <button
                onClick={() => setPayInvoiceModal(r)}
                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Record Payment"
              >
                <Wallet size={14} />
              </button>
            )}
            {canVoid && (
              <button
                onClick={() => setVoidInvoiceModal(r)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Void Invoice"
              >
                <Ban size={14} />
              </button>
            )}
          </div>
        );
      },
    },
  ], [navigate]);

  const filters = useMemo(() => [
    { id: 'status', label: 'Status', getValue: r => r.status, options: Object.keys(INVOICE_STATUS).map(s => ({ value: s, label: s })) },
    { id: 'classId', label: 'Class', getValue: r => r.classId, options: classOptions },
  ], [classOptions]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total billed"      value={formatNaira(summary.totalBilled)}      tint="bg-[#E9F2FC]" text="text-blue-800/70" />
        <StatCard title="Total collected"   value={formatNaira(summary.totalPaid)}        tint="bg-[#FBFADE]" text="text-amber-800/70" />
        <StatCard title="Total outstanding" value={formatNaira(summary.totalOutstanding)} tint="bg-[#EAFBF0]" text="text-emerald-800/70" />
      </div>

      <WorkbenchTable
        title="Invoices"
        storageKey="fee-invoices"
        rows={invoices}
        columns={columns}
        filters={filters}
        searchPlaceholder="Search student or structure…"
        searchKeys={['studentName', 'feeStructureName', 'studentId']}
        onRowClick={(r) => navigate(`${ROUTES.invoices}/${r.id}`)}
        primaryAction={{
          label: 'Generate / Issue Invoices',
          icon: Plus,
          onClick: () => setGenerateModal(true),
        }}
        emptyState={{
          icon: ReceiptText,
          title: 'No invoices yet',
          description: 'Generate invoices for an entire class or issue custom student bills to begin billing.',
          action: { label: 'Generate / Issue Invoices', onClick: () => setGenerateModal(true) },
        }}
      />

      {/* Generate & Issue Invoices Modal */}
      {generateModal && (
        <GenerateInvoicesModal
          structures={structures}
          classes={classes}
          onClose={() => setGenerateModal(false)}
          onGenerated={onInvoicesUpdated}
        />
      )}

      {/* Record Payment Modal */}
      {payInvoiceModal && (
        <RecordPaymentModal
          invoice={payInvoiceModal}
          onClose={() => setPayInvoiceModal(null)}
          onRecorded={() => {
            onInvoicesUpdated?.();
          }}
          showToast={(msg, type) => pushToast({ message: msg, type })}
        />
      )}

      {/* Void Invoice Modal */}
      {voidInvoiceModal && (
        <VoidInvoiceModal
          invoice={voidInvoiceModal}
          onClose={() => setVoidInvoiceModal(null)}
          onVoided={onInvoicesUpdated}
        />
      )}
    </div>
  );
}

