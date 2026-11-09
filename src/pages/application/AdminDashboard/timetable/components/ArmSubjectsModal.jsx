import React, { useState, useEffect, useMemo } from 'react';
import {
  getArmSubjects,
  addSubjectsToArm,
  replaceArmSubjects,
  copySubjectsToArms,
} from '../../services/armAPIs';
import { addSubjectsToClass } from '../../services/classAPIs';
import { getSchoolSubjects, CATEGORY_STYLES, CATEGORY_LABELS } from '../../services/subjectAPIs';
import {
  X,
  BookOpen,
  Plus,
  Trash2,
  Copy,
  RefreshCw,
  Search,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

// ─── Tab IDs ────────────────────
const TABS = [
  { id: 'current',  label: 'Assigned',    icon: BookOpen  },
  { id: 'add',      label: 'Add Subjects', icon: Plus      },
  { id: 'copy',     label: 'Copy from Arm', icon: Copy    },
];

// ─── Tiny helpers ───────────────
const CategoryPill = ({ category }) => {
  const cls = CATEGORY_STYLES[category] || 'bg-gray-100 text-gray-600 border border-gray-200';
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${cls}`}>
      {CATEGORY_LABELS[category] || category || 'Core'}
    </span>
  );
};

// =============================================================================
/**
 * ArmSubjectsModal
 *
 * Props:
 *   arm             { id, classId, name }  — the arm being managed
 *   classArms       { id, name }[]         — sibling arms (for copy-from)
 *   onClose         () => void
 *   onSubjectsChange (armId, count) => void — lets the parent track per-arm counts
 */
export default function ArmSubjectsModal({ arm, classArms, onClose, onSubjectsChange }) {
  const [activeTab,    setActiveTab]    = useState('current');
  const [loading,      setLoading]      = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [toast,        setToast]        = useState(null); // { msg, type }

  // Data owned by this modal, fetched directly from the API.
  const [subjects,    setSubjects]    = useState([]);  // school-wide pool
  const [armSubjects, setArmSubjects] = useState([]);  // this arm's subjects
  const [siblingCounts, setSiblingCounts] = useState({}); // { [armId]: count } for copy tab

  // "Add" tab state
  const [search,        setSearch]        = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState(new Set());
  const [applyToAll,    setApplyToAll]    = useState(false);

  // "Copy" tab state
  const [sourceArmId,   setSourceArmId]   = useState('');
  const [copyConfirmed, setCopyConfirmed] = useState(false);

  // ─── Load the subject pool, this arm's subjects, and sibling counts ─────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [poolRes, armRes] = await Promise.all([
          getSchoolSubjects(),
          getArmSubjects(arm.id),
        ]);
        if (cancelled) return;
        if (poolRes?.success) setSubjects(poolRes.data?.subjects ?? []);
        if (armRes?.success) {
          const subs = armRes.data?.subjects ?? [];
          setArmSubjects(subs);
          onSubjectsChange?.(arm.id, subs.length);
        }

        // Counts for sibling arms (shown in the Copy tab dropdown)
        const siblings = classArms.filter(a => a.id !== arm.id);
        if (siblings.length > 0) {
          const results = await Promise.all(siblings.map(a => getArmSubjects(a.id)));
          if (cancelled) return;
          const counts = {};
          siblings.forEach((a, i) => { counts[a.id] = (results[i]?.data?.subjects ?? []).length; });
          setSiblingCounts(counts);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arm.id]);

  // ─── Toast helper ─────────────
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── School-wide subjects available to add ──────────────────────────────────
  const assignedIds = useMemo(
    () => new Set(armSubjects.map(s => s.id)),
    [armSubjects]
  );

  const availableToAdd = useMemo(() => {
    return subjects.filter(s => {
      const notAssigned = !assignedIds.has(s.id);
      const matchesSearch =
        !search.trim() ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.code || '').toLowerCase().includes(search.toLowerCase());
      return notAssigned && matchesSearch;
    });
  }, [subjects, assignedIds, search]);

  // ─── Remove a single subject from arm ─
  const handleRemove = async (subject) => {
    const previous = armSubjects;
    const next = armSubjects.filter(s => s.id !== subject.id);
    // Optimistic UI
    setArmSubjects(next);
    onSubjectsChange?.(arm.id, next.length);
    try {
      await replaceArmSubjects(arm.id, next.map(s => s.id));
      showToast(`"${subject.name}" removed`);
    } catch (e) {
      // Roll back on error
      setArmSubjects(previous);
      onSubjectsChange?.(arm.id, previous.length);
      showToast('Failed to remove subject', 'error');
    }
  };

  // ─── Add selected subjects ────
  const handleAddSelected = async () => {
    if (selectedToAdd.size === 0) return;
    const ids = [...selectedToAdd];
    const subjectsToAdd = subjects.filter(s => ids.includes(s.id));
    const nextArmSubjects = [...armSubjects, ...subjectsToAdd];

    setLoading(true);
    try {
      if (applyToAll) {
        // Add to every arm in the class via class-level endpoint
        const res = await addSubjectsToClass(arm.classId, ids);
        if (res.success) {
          setArmSubjects(nextArmSubjects);
          onSubjectsChange?.(arm.id, nextArmSubjects.length);
          showToast(`${ids.length} subject(s) added to all arms`);
        }
      } else {
        const res = await addSubjectsToArm(arm.id, ids);
        if (res.success) {
          setArmSubjects(nextArmSubjects);
          onSubjectsChange?.(arm.id, nextArmSubjects.length);
          showToast(`${ids.length} subject(s) added`);
        }
      }
      setSelectedToAdd(new Set());
      setActiveTab('current');
    } catch (e) {
      showToast('Failed to add subjects', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── Copy from another arm ────
  const handleCopy = async () => {
    if (!sourceArmId) return;
    setLoading(true);
    try {
      const res = await copySubjectsToArms(sourceArmId, [arm.id]);
      if (res.success) {
        // Re-fetch this arm's subjects so the merged result is accurate
        const refreshed = await getArmSubjects(arm.id);
        const subs = refreshed?.success ? (refreshed.data?.subjects ?? []) : armSubjects;
        setArmSubjects(subs);
        onSubjectsChange?.(arm.id, subs.length);
        showToast('Subjects copied successfully');
        setCopyConfirmed(false);
        setSourceArmId('');
        setActiveTab('current');
      }
    } catch (e) {
      showToast('Failed to copy subjects', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle selection in Add tab
  const toggleSelect = (id) => {
    setSelectedToAdd(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const siblingsForCopy = classArms.filter(a => a.id !== arm.id);

  // ─── Render ───────────────────
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/30" onClick={onClose} />

        {/* Panel */}
        <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[85vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <BookOpen size={16} className="text-blue-600" />
                Arm Subjects — <span className="text-blue-600">{arm.name}</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Manage which subjects are offered in this arm
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 px-6 shrink-0 bg-gray-50/50">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
                {tab.id === 'current' && armSubjects.length > 0 && (
                  <span className="ml-1 bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 rounded-full">
                    {armSubjects.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Toast */}
          {toast && (
            <div className={`mx-6 mt-3 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shrink-0 ${
              toast.type === 'error'
                ? 'bg-red-50 text-red-700'
                : 'bg-green-50 text-green-700'
            }`}>
              {toast.type === 'error'
                ? <AlertTriangle size={14} />
                : <CheckCircle2 size={14} />}
              {toast.msg}
            </div>
          )}

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* ── CURRENT SUBJECTS ────── */}
            {activeTab === 'current' && (
              <>
                {initializing ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
                    <Loader2 size={16} className="animate-spin" />
                    Loading subjects…
                  </div>
                ) : armSubjects.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen size={32} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-sm font-semibold text-gray-500">No subjects assigned yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Switch to "Add Subjects" to get started.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {armSubjects.map(subj => (
                      <div
                        key={subj.id}
                        className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 group"
                      >
                        <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {subj.code || subj.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {subj.name}
                          </p>
                          {subj.category && (
                            <CategoryPill category={subj.category} />
                          )}
                        </div>
                        <button
                          onClick={() => handleRemove(subj)}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                          title="Remove from arm"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── ADD SUBJECTS ── */}
            {activeTab === 'add' && (
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
                  <input
                    type="text"
                    placeholder="Search school subjects…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Apply-to-all option */}
                {classArms.length > 1 && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={applyToAll}
                      onChange={e => setApplyToAll(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-gray-700 font-medium">
                      Apply to <strong>all arms</strong> in this class
                    </span>
                    <span className="text-[10px] text-gray-400">
                      ({classArms.map(a => a.name).join(', ')})
                    </span>
                  </label>
                )}

                {/* Subject list */}
                {subjects.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    No school-wide subjects defined yet. Go to{' '}
                    <span className="font-semibold">Config → Subject Setup</span> first.
                  </p>
                ) : availableToAdd.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    {search
                      ? `No subjects match "${search}"`
                      : 'All school subjects are already assigned to this arm.'}
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {availableToAdd.map(subj => {
                      const selected = selectedToAdd.has(subj.id);
                      return (
                        <button
                          key={subj.id}
                          onClick={() => toggleSelect(subj.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left ${
                            selected
                              ? 'border-blue-400 bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                              selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                            }`}
                          >
                            {selected && <CheckCircle2 size={12} className="text-white" />}
                          </div>
                          <div className="w-7 h-7 rounded bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {subj.code || subj.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {subj.name}
                            </p>
                          </div>
                          {subj.category && <CategoryPill category={subj.category} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── COPY FROM ARM ─ */}
            {activeTab === 'copy' && (
              <div className="space-y-5">
                {siblingsForCopy.length === 0 ? (
                  <div className="text-center py-12">
                    <Copy size={28} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-sm font-semibold text-gray-500">
                      No other arms in this class
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Copy requires at least one sibling arm.
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">
                        Copy subjects from
                      </label>
                      <select
                        value={sourceArmId}
                        onChange={e => {
                          setSourceArmId(e.target.value);
                          setCopyConfirmed(false);
                        }}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                      >
                        <option value="">Select source arm…</option>
                        {siblingsForCopy.map(a => {
                          const count = siblingCounts[a.id] ?? 0;
                          return (
                            <option key={a.id} value={a.id}>
                              Arm {a.name} ({count} subject{count !== 1 ? 's' : ''})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {sourceArmId && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-start gap-2">
                          <RefreshCw size={14} className="text-amber-600 mt-0.5 shrink-0" />
                          <p className="text-sm text-amber-800">
                            This will{' '}
                            <strong>add</strong> all subjects from arm{' '}
                            <strong>{siblingsForCopy.find(a => a.id === sourceArmId)?.name}</strong>{' '}
                            into arm <strong>{arm.name}</strong>. Existing subjects are preserved.
                          </p>
                        </div>
                        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={copyConfirmed}
                            onChange={e => setCopyConfirmed(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-amber-800 font-medium">
                            Yes, I confirm this copy
                          </span>
                        </label>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50/50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition"
            >
              Close
            </button>

            <div className="flex items-center gap-2">
              {/* Add tab confirm */}
              {activeTab === 'add' && (
                <button
                  onClick={handleAddSelected}
                  disabled={loading || selectedToAdd.size === 0}
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition"
                >
                  {loading
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Plus size={14} />}
                  Add {selectedToAdd.size > 0 ? `${selectedToAdd.size} ` : ''}Subject{selectedToAdd.size !== 1 ? 's' : ''}
                  {applyToAll && ' to All Arms'}
                </button>
              )}

              {/* Copy tab confirm */}
              {activeTab === 'copy' && (
                <button
                  onClick={handleCopy}
                  disabled={loading || !sourceArmId || !copyConfirmed}
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition"
                >
                  {loading
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Copy size={14} />}
                  Copy Subjects
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
