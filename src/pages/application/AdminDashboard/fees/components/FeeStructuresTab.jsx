import React, { useState, useMemo, useEffect } from 'react';
import {
  getFeeStructureById,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  transitionFeeStructure,
  cloneFeeStructure,
  generateInvoicesForClass,
  getFeeStructureVersions,
  formatNaira,
  toKobo,
  sumItems,
  FEE_TYPES,
} from '../../services/feeAPIs.js';
import {
  Plus,
  Trash2,
  Pencil,
  Copy,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  FileStack,
  Eye,
  History,
} from 'lucide-react';
import { WorkbenchTable, StatusChip } from '../../../../../components/patterns';

// ─── Status pill ────────────────
const StatusPill = ({ status }) => <StatusChip status={status} />;

// ─── Format date to human-readable format e.g. "Jun 17, 2026" ───
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

// ─── Item Pluralization and Summary Breakdown ───
function formatItemSummary(items = []) {
  if (!items.length) {
    return <span className="text-gray-400">No items</span>;
  }

  const names = items.map((i) => i?.name).filter(Boolean);

  if (!names.length) {
    return (
        <span className="font-semibold text-gray-700">
        {items.length} {items.length === 1 ? 'item' : 'items'}
      </span>
    );
  }

  const visibleNames = names.slice(0, 2).join(', ');
  const remaining = items.length - 2;

  return (
      <span className="truncate block">
      {visibleNames}
        {remaining > 0 && (
            <>
              {' '}
              <span className="text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
            +{remaining} more
          </span>
            </>
        )}
    </span>
  );
}

// ─── Section Grouping Categorizer ───
function getSectionCategory(className = '') {
  const name = String(className).toUpperCase().trim();
  if (name.includes('SSS') || name.includes('SENIOR') || /^SS\s*\d/.test(name)) return 'Senior Secondary';
  if (name.includes('JSS') || name.includes('JUNIOR') || /^JS\s*\d/.test(name)) return 'Junior Secondary';
  if (name.includes('PRIMARY') || name.includes('BASIC') || /^PR\s*\d/.test(name)) return 'Primary School';
  if (
    name.includes('NURSERY') ||
    name.includes('KG') ||
    name.includes('CRECHE') ||
    name.includes('RECEPTION') ||
    name.includes('KINDER')
  )
    return 'Nursery & Early Years';
  return 'General / Uncategorized';
}

// ─── Fee Structure Detail View Modal ──────────────
function FeeStructureDetailModal({ structure, onClose, formatNaira, onViewHistory, classes = [], currentTerm }) {
  if (!structure) return null;

  const totalKobo = structure.totalAmount ?? structure.items?.reduce((acc, it) => acc + (Number(it.amount) || 0), 0) ?? 0;
  const clsObj = classes.find(c => c.id === structure.classId);
  const targetClassName = structure.className || clsObj?.name || '—';
  const displayClass = structure.armName ? `${targetClassName} (${structure.armName})` : targetClassName;
  const displayTerm = structure.termName || currentTerm?.name || '—';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/40" onClick={onClose} />
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150 border border-gray-100">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <FileStack size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">{structure.name}</h3>
                  <StatusChip status={structure.status} />
                  <span className="text-[10px] font-bold text-gray-400 uppercase bg-gray-100 px-1.5 py-0.5 rounded">
                    v{structure.version || 1}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Class: <span className="font-semibold text-gray-700">{displayClass}</span>
                  {displayTerm !== '—' && (
                    <> &bull; Term: <span className="font-semibold text-gray-700">{displayTerm}</span></>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/70 p-4 rounded-xl border border-gray-100">
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400 block tracking-wider">Target Class</span>
                <span className="text-sm font-bold text-gray-900 truncate block">{displayClass}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400 block tracking-wider">Term</span>
                <span className="text-sm font-semibold text-gray-800 truncate block">{displayTerm}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400 block tracking-wider">Total Amount</span>
                <span className="text-base font-bold text-gray-900">{formatNaira(totalKobo)}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400 block tracking-wider">Payment Type</span>
                <span className="text-sm font-semibold text-gray-800 capitalize">{structure.paymentType || 'one-time'}</span>
              </div>
            </div>

            {/* Fee Items Breakdown */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                Fee Items Breakdown ({structure.items?.length || 0})
              </h4>
              <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100">
                {structure.items?.length > 0 ? (
                  structure.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-gray-400 w-5">{idx + 1}.</span>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{item.name}</p>
                          <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-1.5 py-0.5 rounded">
                            {item.feeType}
                          </span>
                          {item.optional && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded ml-1.5">
                              Optional
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-gray-900">{formatNaira(item.amount)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 p-4 text-center">No fee items defined.</p>
                )}
              </div>
            </div>

            {/* Installment Plans (if any) */}
            {structure.installmentPlans?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Installment Schedule</h4>
                <div className="space-y-2">
                  {structure.installmentPlans.map((plan, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-amber-50/40 border border-amber-100 rounded-xl">
                      <div>
                        <p className="text-xs font-bold text-gray-800">{plan.label}</p>
                        <p className="text-[11px] text-gray-500">Due: {formatDate(plan.dueDate)}</p>
                      </div>
                      <span className="text-sm font-bold text-amber-700">{plan.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata Footer info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-gray-100 text-[11px] text-gray-400">
              <div>
                <span className="block font-bold text-gray-500">Class Name</span>
                <span className="truncate block font-semibold text-gray-700">{displayClass}</span>
              </div>
              <div>
                <span className="block font-bold text-gray-500">Term Name</span>
                <span className="truncate block font-semibold text-gray-700">{displayTerm}</span>
              </div>
              <div>
                <span className="block font-bold text-gray-500">Created At</span>
                <span>{formatDate(structure.createdAt)}</span>
              </div>
              <div>
                <span className="block font-bold text-gray-500">Last Updated</span>
                <span>{formatDate(structure.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
            {onViewHistory ? (
              <button
                onClick={() => {
                  onClose();
                  onViewHistory(structure);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-xl transition-colors"
              >
                <History size={14} /> View Version History
              </button>
            ) : <div />}
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Version History Audit Trail Modal ──────────────
function VersionHistoryModal({ structure, onClose }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadVersions() {
      try {
        setLoading(true);
        const res = await getFeeStructureVersions(structure.id);
        if (isMounted) {
          const list = res.data?.versions || res.versions || res.data || [];
          setVersions(Array.isArray(list) ? list : []);
        }
      } catch {
        if (isMounted) setVersions([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    if (structure?.id) {
      loadVersions();
    }
    return () => { isMounted = false; };
  }, [structure?.id]);

  if (!structure) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/40" onClick={onClose} />
        <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh] border border-gray-100 animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <History size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Version Audit Trail</h3>
                <p className="text-xs text-gray-400">{structure.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Loader2 size={24} className="animate-spin mb-2 text-blue-600" />
                <p className="text-xs font-semibold">Loading version history...</p>
              </div>
            ) : versions.length > 0 ? (
              <div className="relative pl-6 border-l-2 border-gray-100 space-y-6">
                {versions.map((ver, idx) => (
                  <div key={ver.id || idx} className="relative">
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-sm" />
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900 bg-white border border-gray-200 px-2 py-0.5 rounded-md">
                            Version {ver.version || (versions.length - idx)}
                          </span>
                          <StatusChip status={ver.status || structure.status} />
                        </div>
                        <span className="text-[11px] text-gray-400">
                          {formatDate(ver.createdAt || ver.updatedAt)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 font-medium mb-1">
                        Total Amount: <span className="font-bold text-gray-900">{formatNaira(ver.totalAmount || 0)}</span>
                      </p>
                      {ver.items?.length > 0 && (
                        <p className="text-[11px] text-gray-500 mt-1">
                          Items: {ver.items.map(i => i.name).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm font-semibold">Current Version: v{structure.version || 1}</p>
                <p className="text-xs mt-1">No prior revision records found for this fee structure.</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
            <button onClick={onClose} className="px-5 py-2 text-sm font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Builder modal ──────────────
function StructureBuilder({ initial, onClose, onSaved, showToast, classes = [], currentYear, currentTerm }) {
  const isEdit = Boolean(initial?.id);

  const [name, setName]               = useState(initial?.name || '');
  const [classId, setClassId]         = useState(initial?.classId || '');
  const [dueDate, setDueDate]         = useState(initial?.dueDate ? initial.dueDate.split('T')[0] : '');
  const [paymentType, setPaymentType] = useState(initial?.paymentType || 'one-time');
  const [items, setItems]             = useState(
    initial?.items?.map(i => ({ ...i, amount: i.amount / 100 })) || [
      { feeType: 'tuition', name: 'Tuition', amount: '', optional: false },
    ]
  );
  const [plans, setPlans] = useState(
    initial?.installmentPlans || [{ label: '1st Installment', percentage: 50, dueDate: '' }]
  );
  const [saving, setSaving] = useState(false);

  const updateItem = (idx, patch) =>
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addItem = () =>
    setItems([...items, { feeType: 'miscellaneous', name: '', amount: '', optional: true }]);
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const updatePlan = (idx, patch) =>
    setPlans(plans.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  const addPlan = () =>
    setPlans([...plans, { label: `${plans.length + 1} Installment`, percentage: 0, dueDate: '' }]);
  const removePlan = (idx) => setPlans(plans.filter((_, i) => i !== idx));

  const totalNaira = items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);

  const handleSave = async () => {
    if (!name.trim())  return showToast('Structure name is required', 'error');
    if (!classId)      return showToast('Select a class', 'error');
    if (items.some(i => !i.name.trim() || !i.amount))
      return showToast('Each fee item needs a name and amount', 'error');
    if (paymentType === 'installment') {
      const totalPct = plans.reduce((a, p) => a + (Number(p.percentage) || 0), 0);
      if (totalPct !== 100)
        return showToast(`Installment percentages must total 100% (currently ${totalPct}%)`, 'error');
    }

    const cls = classes.find(c => c.id === classId);
    const payload = {
      academicYearId: currentYear?.id,
      termId: currentTerm?.id,
      classId,
      className: cls?.name || '',
      name: name.trim(),
      items: items.map(i => ({
        feeType: i.feeType,
        name: i.name.trim(),
        amount: toKobo(i.amount),
        optional: !!i.optional,
      })),
      totalAmount: toKobo(totalNaira),
      dueDate,
      paymentType,
      ...(paymentType === 'installment' ? { installmentPlans: plans } : {}),
    };

    setSaving(true);
    try {
      const res = isEdit
        ? await updateFeeStructure(initial.id, payload)
        : await createFeeStructure(payload);
      if (res.success) {
        onSaved(res.data.feeStructure, isEdit);
        showToast(isEdit ? 'Fee structure updated' : 'Fee structure created (draft)');
        onClose();
      }
    } catch (e) {
      showToast(e.message || 'Failed to save structure', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/30" onClick={onClose} />
        <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[88vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-base font-bold text-gray-900">
              {isEdit ? 'Edit Fee Structure' : 'New Fee Structure'}
            </h3>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Structure Name *</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. JSS1 First Term Fees"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Class *</label>
                <select
                  value={classId}
                  onChange={e => setClassId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  <option value="">Select class…</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Payment Type</label>
                <select
                  value={paymentType}
                  onChange={e => setPaymentType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  <option value="one-time">One-time</option>
                  <option value="installment">Installment</option>
                </select>
              </div>
            </div>

            {/* Fee items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Fee Items</label>
                <button
                  onClick={addItem}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus size={13} /> Add item
                </button>
              </div>
              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2">
                    <select
                      value={it.feeType}
                      onChange={e => {
                        const ft = FEE_TYPES.find(f => f.id === e.target.value);
                        updateItem(idx, {
                          feeType: e.target.value,
                          name: it.name || ft?.label || '',
                          optional: ft?.optional ?? it.optional,
                        });
                      }}
                      className="px-2 py-1.5 border border-gray-200 rounded text-xs bg-white w-36"
                    >
                      {FEE_TYPES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                    <input
                      value={it.name}
                      onChange={e => updateItem(idx, { name: e.target.value })}
                      placeholder="Display name"
                      className="flex-1 min-w-32 px-2 py-1.5 border border-gray-200 rounded text-xs"
                    />
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-xs text-gray-400">₦</span>
                      <input
                        type="number"
                        value={it.amount}
                        onChange={e => updateItem(idx, { amount: e.target.value })}
                        placeholder="0"
                        className="w-32 pl-5 pr-2 py-1.5 border border-gray-200 rounded text-xs"
                      />
                    </div>
                    <label className="flex items-center gap-1 text-[11px] text-gray-600 select-none">
                      <input
                        type="checkbox"
                        checked={!!it.optional}
                        onChange={e => updateItem(idx, { optional: e.target.checked })}
                        className="rounded text-blue-600"
                      />
                      Optional
                    </label>
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(idx)}
                        className="p-1 text-gray-300 hover:text-red-500 rounded"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-right mt-2 text-sm font-bold text-gray-800">
                Total: {formatNaira(toKobo(totalNaira))}
              </div>
            </div>

            {/* Installment plans */}
            {paymentType === 'installment' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Installment Plans</label>
                  <button
                    onClick={addPlan}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus size={13} /> Add plan
                  </button>
                </div>
                <div className="space-y-2">
                  {plans.map((p, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-2 bg-amber-50/50 border border-amber-100 rounded-lg p-2">
                      <input
                        value={p.label}
                        onChange={e => updatePlan(idx, { label: e.target.value })}
                        placeholder="Label"
                        className="flex-1 min-w-32 px-2 py-1.5 border border-gray-200 rounded text-xs"
                      />
                      <div className="relative">
                        <input
                          type="number"
                          value={p.percentage}
                          onChange={e => updatePlan(idx, { percentage: Number(e.target.value) })}
                          className="w-20 px-2 py-1.5 border border-gray-200 rounded text-xs"
                        />
                        <span className="absolute right-2 top-1.5 text-xs text-gray-400">%</span>
                      </div>
                      <input
                        type="date"
                        value={p.dueDate ? p.dueDate.split('T')[0] : ''}
                        onChange={e => updatePlan(idx, { dueDate: e.target.value })}
                        className="px-2 py-1.5 border border-gray-200 rounded text-xs"
                      />
                      {plans.length > 1 && (
                        <button
                          onClick={() => removePlan(idx)}
                          className="p-1 text-gray-300 hover:text-red-500 rounded"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50/50">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Draft'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Clone Structure Modal ──────────────
function CloneStructureModal({ structure, classes, onClose, onConfirm, cloning }) {
  if (!structure) return null;
  const [cloneName, setCloneName] = useState(`${structure.name} (Draft)`);
  const [targetClassId, setTargetClassId] = useState(structure.classId || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!cloneName.trim() || !targetClassId) return;
    onConfirm({
      name: cloneName.trim(),
      classId: targetClassId,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={() => !cloning && onClose()} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-gray-100 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Copy size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Clone Fee Structure</h3>
              <p className="text-xs text-gray-500">Create a draft duplicate for a class</p>
            </div>
          </div>
          <button onClick={onClose} disabled={cloning} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">New Structure Name *</label>
            <input
              type="text"
              value={cloneName}
              onChange={(e) => setCloneName(e.target.value)}
              placeholder="e.g. SSS2 First Term Fees (Draft)"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Target Class *</label>
            <select
              value={targetClassId}
              onChange={(e) => setTargetClassId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
              required
            >
              <option value="">Select class…</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={cloning}
              className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={cloning || !cloneName.trim() || !targetClassId}
              className="flex-1 px-4 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {cloning && <Loader2 size={14} className="animate-spin" />}
              {cloning ? 'Cloning…' : 'Create Draft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main tab ───────────────────
export default function FeeStructuresTab({ showToast, classes = [], currentYear, currentTerm, structures = [], setStructures }) {
  const [builder, setBuilder] = useState(null);              // null | {} | structure
  const [publishConfirm, setPublishConfirm] = useState(null); // null | structure
  const [deleteConfirm, setDeleteConfirm] = useState(null);   // null | structure
  const [cloneConfirm, setCloneConfirm] = useState(null);     // null | structure
  const [viewDetailModal, setViewDetailModal] = useState(null); // null | structure object
  const [versionHistoryModal, setVersionHistoryModal] = useState(null); // null | structure object
  const [loadingDetail, setLoadingDetail] = useState(null);     // null | structureId
  const [deleting, setDeleting] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [publishStep, setPublishStep] = useState(false);       // false | 'publishing' | 'generating'

  const handleSaved = (structure, isEdit) => {
    setStructures(prev => isEdit
      ? prev.map(s => (s.id === structure.id ? { ...s, ...structure } : s))
      : [structure, ...prev]);
  };

  // ── View Detail flow ───────────
  const handleViewDetail = async (structureId) => {
    try {
      setLoadingDetail(structureId);
      const res = await getFeeStructureById(structureId);
      if (res.success && res.data?.feeStructure) {
        setViewDetailModal(res.data.feeStructure);
      } else {
        showToast(res.message || 'Failed to load details', 'error');
      }
    } catch (e) {
      showToast(e.message || 'Failed to load details', 'error');
    } finally {
      setLoadingDetail(null);
    }
  };

  // ── Publish flow ──────────────
  const handlePublishRequest = (s) => setPublishConfirm(s);

  const handleConfirmPublish = async () => {
    if (!publishConfirm) return;

    try {
      setPublishStep('publishing');
      const transRes = await transitionFeeStructure(publishConfirm.id, 'publish');

      if (!transRes.success) {
        showToast(transRes.message || 'Publish failed', 'error');
        return;
      }

      setStructures(prev => prev.map(s =>
        s.id === publishConfirm.id ? { ...s, ...transRes.data.feeStructure } : s
      ));

      setPublishStep('generating');
      const genRes = await generateInvoicesForClass({
        feeStructureId: publishConfirm.id,
        classId: publishConfirm.classId,
      });

      const invoiceCount = genRes.data?.generated ?? 0;
      const skipped      = genRes.data?.skipped ?? 0;
      const className    = publishConfirm.className || 'the class';
      showToast(
        invoiceCount > 0
          ? `Published & ${invoiceCount} invoice${invoiceCount !== 1 ? 's' : ''} generated for ${className}` +
            (skipped ? ` (${skipped} already billed, skipped)` : '')
          : `Fee structure published for ${className}`
      );
      setPublishConfirm(null);

    } catch (e) {
      showToast(e.message || 'Publish failed', 'error');
    } finally {
      setPublishStep(false);
    }
  };

  // ── Delete flow ───────────────
  const handleDeleteRequest = (s) => setDeleteConfirm(s);

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setDeleting(true);
      const res = await deleteFeeStructure(deleteConfirm.id);
      if (res.success || res.status === 200) {
        setStructures(prev => prev.filter(x => x.id !== deleteConfirm.id));
        showToast('Fee structure deleted successfully');
        setDeleteConfirm(null);
      } else {
        showToast(res.message || 'Delete failed', 'error');
      }
    } catch (e) {
      showToast(e.message || 'Failed to delete fee structure', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ── Clone flow ───────────────
  const handleCloneRequest = (s) => setCloneConfirm(s);

  const handleConfirmClone = async (cloneData) => {
    if (!cloneConfirm) return;
    try {
      setCloning(true);
      const targetClassId = cloneData?.classId || cloneConfirm.classId;
      const targetName = cloneData?.name || `${cloneConfirm.name} (Draft)`;
      const targetClass = classes.find(c => c.id === targetClassId);

      const res = await cloneFeeStructure(cloneConfirm.id, {
        targetAcademicYearId: currentYear?.id,
        targetTermId: currentTerm?.id,
        targetClassIds: [targetClassId],
      });

      if (res.success || res.status === 200) {
        const cloned = res.data?.feeStructures?.length
          ? res.data.feeStructures.map(s => ({
              ...s,
              name: targetName,
              className: targetClass?.name || s.className,
              status: 'draft',
            }))
          : [{
              ...cloneConfirm,
              id: `clone_${Date.now()}`,
              name: targetName,
              classId: targetClassId,
              className: targetClass?.name || cloneConfirm.className,
              status: 'draft',
              version: 1,
            }];
        setStructures(prev => [...cloned, ...prev]);
        showToast(`Fee structure cloned as draft successfully`);
        setCloneConfirm(null);
      } else {
        showToast(res.message || 'Clone failed', 'error');
      }
    } catch (e) {
      showToast(e.message || 'Clone failed', 'error');
    } finally {
      setCloning(false);
    }
  };

  // ── Published Count per Class for Conflict Detection ──────
  const publishedCountByClass = useMemo(() => {
    return structures.reduce((acc, s) => {
      if (s.status === 'published' && s.classId) {
        acc[s.classId] = (acc[s.classId] || 0) + 1;
      }
      return acc;
    }, {});
  }, [structures]);

  const existingPublishedForClass = publishConfirm
    ? structures.find(
        s => s.status === 'published' && s.classId === publishConfirm.classId && s.id !== publishConfirm.id
      )
    : null;

  // ── WorkbenchTable Columns Configuration ──────────────────
  const columns = useMemo(() => [
    {
      id: 'class',
      header: 'Class / Level',
      accessor: r => r.className || classes.find(c => c.id === r.classId)?.name || '—',
      sortable: true,
      hideable: false,
      render: r => {
        const clsName = r.className || classes.find(c => c.id === r.classId)?.name || '—';
        const hasCustomName = r.name && r.name.trim().toLowerCase() !== clsName.trim().toLowerCase();
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900">{clsName}</span>
            {hasCustomName && (
              <span className="text-xs text-gray-400 font-normal truncate max-w-[220px]" title={r.name}>
                {r.name}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'items',
      header: 'Fee Components',
      accessor: r => r.items?.length || 0,
      sortable: true,
      render: r => formatItemSummary(r.items),
    },
    {
      id: 'totalAmount',
      header: 'Total Amount',
      accessor: r => r.totalAmount ?? sumItems(r.items),
      sortable: true,
      align: 'right',
      render: r => (
        <span className="font-semibold text-gray-900">
          {formatNaira(r.totalAmount ?? sumItems(r.items))}
        </span>
      ),
    },
    {
      id: 'dueDate',
      header: 'Due Date',
      accessor: r => r.dueDate,
      sortable: true,
      render: r => <span className="text-gray-600">{formatDate(r.dueDate)}</span>,
    },
    {
      id: 'status',
      header: 'Status & Version',
      accessor: r => r.status,
      sortable: true,
      render: r => {
        const isPublishedConflict = publishedCountByClass[r.classId] > 1 && r.status === 'published';
        return (
          <div className="flex items-center gap-2">
            <StatusChip status={r.status} />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setVersionHistoryModal(r);
              }}
              className="text-[10px] font-bold text-gray-500 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 px-1.5 py-0.5 rounded transition-colors"
              title="Click to view version history audit trail"
            >
              v{r.version || 1}
            </button>
            {isPublishedConflict && (
              <span
                className="inline-flex items-center text-amber-600 bg-amber-50 p-1 rounded-md"
                title="Multiple published versions exist for this class"
              >
                <AlertTriangle size={13} />
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      hideable: false,
      render: r => {
        const isDraft = r.status === 'draft';
        return (
          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
            {/* View Details */}
            <button
              onClick={() => handleViewDetail(r.id)}
              disabled={loadingDetail === r.id}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              title="View Details"
            >
              {loadingDetail === r.id ? (
                <Loader2 size={14} className="animate-spin text-blue-600" />
              ) : (
                <Eye size={14} />
              )}
            </button>

            {/* Publish (Draft only) */}
            {isDraft && (
              <button
                onClick={() => handlePublishRequest(r)}
                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Publish Structure"
              >
                <CheckCircle2 size={14} />
              </button>
            )}

            {/* Clone / Duplicate */}
            <button
              onClick={() => handleCloneRequest(r)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Clone Structure"
            >
              <Copy size={14} />
            </button>

            {/* Edit (Draft only) */}
            {isDraft && (
              <button
                onClick={() => setBuilder(r)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit Draft"
              >
                <Pencil size={14} />
              </button>
            )}

            {/* Delete (Draft only) */}
            {isDraft && (
              <button
                onClick={() => handleDeleteRequest(r)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete Draft"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        );
      },
    },
  ], [classes, loadingDetail, publishedCountByClass]);

  // ── WorkbenchTable Filters ──────────────────
  const filters = useMemo(() => [
    {
      id: 'status',
      label: 'Status',
      getValue: r => r.status,
      options: [
        { value: 'published', label: 'Published' },
        { value: 'draft', label: 'Draft' },
        { value: 'archived', label: 'Archived' },
      ],
    },
    {
      id: 'classId',
      label: 'Class',
      getValue: r => r.classId,
      options: classes.map(c => ({ value: c.id, label: c.name })),
    },
  ], [classes]);

  return (
    <div className="space-y-5">
      <WorkbenchTable
        title="Fee Structures"
        storageKey="fee-structures"
        rows={structures}
        columns={columns}
        filters={filters}
        searchPlaceholder="Search class, structure or item…"
        searchKeys={[
          r => r.name,
          r => r.className || classes.find(c => c.id === r.classId)?.name,
          r => r.items?.map(i => i.name).join(' '),
        ]}
        onRowClick={(r) => handleViewDetail(r.id)}
        primaryAction={{
          label: 'New Structure',
          icon: Plus,
          onClick: () => setBuilder({}),
        }}
        emptyState={{
          icon: FileStack,
          title: 'No fee structures yet',
          description: 'Create fee structures per class and term to begin billing.',
          action: { label: 'New Structure', onClick: () => setBuilder({}) },
        }}
      />

      {/* Structure builder modal */}
      {builder && (
        <StructureBuilder
          initial={builder.id ? builder : null}
          onClose={() => setBuilder(null)}
          onSaved={handleSaved}
          showToast={showToast}
          classes={classes}
          currentYear={currentYear}
          currentTerm={currentTerm}
        />
      )}

      {/* Fee Structure Detail View Modal */}
      {viewDetailModal && (
        <FeeStructureDetailModal
          structure={viewDetailModal}
          onClose={() => setViewDetailModal(null)}
          formatNaira={formatNaira}
          onViewHistory={(str) => setVersionHistoryModal(str)}
          classes={classes}
          currentTerm={currentTerm}
        />
      )}

      {/* Version History Audit Trail Modal */}
      {versionHistoryModal && (
        <VersionHistoryModal
          structure={versionHistoryModal}
          onClose={() => setVersionHistoryModal(null)}
        />
      )}

      {/* Publish confirmation modal */}
      {publishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => !publishStep && setPublishConfirm(null)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 border border-amber-200 mx-auto mb-4">
              <AlertTriangle size={22} className="text-amber-500" />
            </div>

            <h3 className="text-base font-bold text-gray-900 text-center mb-1">Publish Fee Structure?</h3>
            <p className="text-sm text-gray-600 text-center mb-1">
              You are about to publish:
            </p>
            <p className="text-sm font-semibold text-gray-800 text-center mb-4">
              &ldquo;{publishConfirm.name}&rdquo;
            </p>

            {/* Dual published warning */}
            {existingPublishedForClass && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-4 text-left">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Duplicate Published Alert</h4>
                    <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                      Class <strong>{publishConfirm.className || 'this class'}</strong> already has an active published structure: &ldquo;{existingPublishedForClass.name}&rdquo;. Publishing this version will replace it as active.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Warning callout */}
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl px-4 py-3 mb-5">
              <p className="text-xs font-semibold text-blue-800 leading-relaxed">
                ℹ️&nbsp; Once published, invoices will be automatically generated and visible to students/parents.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPublishConfirm(null)}
                disabled={!!publishStep}
                className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPublish}
                disabled={!!publishStep}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {publishStep && <Loader2 size={14} className="animate-spin" />}
                {publishStep === 'publishing' && 'Publishing…'}
                {publishStep === 'generating' && 'Generating invoices…'}
                {!publishStep && 'Yes, Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => !deleting && setDeleteConfirm(null)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 border border-red-200 mx-auto mb-4">
              <Trash2 size={22} className="text-red-600" />
            </div>

            <h3 className="text-base font-bold text-gray-900 text-center mb-1">Delete Fee Structure?</h3>
            <p className="text-sm text-gray-600 text-center mb-1">
              Are you sure you want to delete draft fee structure:
            </p>
            <p className="text-sm font-semibold text-gray-800 text-center mb-4">
              &ldquo;{deleteConfirm.name}&rdquo;
            </p>

            <p className="text-xs text-gray-500 text-center mb-6">
              This will permanently remove the fee structure draft.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                {deleting ? 'Deleting…' : 'Delete Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clone modal */}
      {cloneConfirm && (
        <CloneStructureModal
          structure={cloneConfirm}
          classes={classes}
          onClose={() => setCloneConfirm(null)}
          onConfirm={handleConfirmClone}
          cloning={cloning}
        />
      )}
    </div>
  );
}
