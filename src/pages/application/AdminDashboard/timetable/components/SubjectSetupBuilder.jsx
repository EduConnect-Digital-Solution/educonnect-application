import React, { useState, useEffect } from 'react';
import { availableSubjects as defaultSubjects } from '../../../../../utils/imports';
import {
  Import,
  Search,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Wand2,
} from 'lucide-react';
import {
  getSchoolSubjects,
  bulkCreateSubjects,
  createSubject,
  updateSubject,
  deleteSubjects,
  autoGenerateCode,
  SUBJECT_CATEGORIES,
  CATEGORY_LABELS,
  CATEGORY_STYLES,
} from '../../services/subjectAPIs.js';

// ─── Category pill ───────────────
const CategoryPill = ({ category }) => {
  const cls = CATEGORY_STYLES[category] || 'bg-gray-100 text-gray-500 border border-gray-200';
  return (
    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${cls}`}>
      {CATEGORY_LABELS[category] || 'Core'}
    </span>
  );
};

// ─── Inline subject form (used for both "add new" and "edit existing") ────────
function SubjectForm({ initial = {}, onSave, onCancel, loading }) {
  const [name,     setName]     = useState(initial.name     || '');
  const [code,     setCode]     = useState(initial.code     || '');
  const [category, setCategory] = useState(initial.category || 'core');

  const handleAutoCode = () => setCode(autoGenerateCode(name));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), code: code.trim() || undefined, category });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-gray-50 border border-gray-200 rounded-xl mb-4 shrink-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
        {/* Name */}
        <div className="flex-1 w-full">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
            Subject Name *
          </label>
          <input
            autoFocus
            required
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Advanced Physics"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
          />
        </div>

        {/* Code + auto-generate */}
        <div className="w-full sm:w-36">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
            Code
          </label>
          <div className="flex gap-1">
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="MTH"
              maxLength={6}
              className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm uppercase focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
            />
            <button
              type="button"
              onClick={handleAutoCode}
              title="Auto-generate code from name"
              className="px-2 py-2 border border-gray-200 bg-white rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-300 transition shrink-0"
            >
              <Wand2 size={14} />
            </button>
          </div>
        </div>

        {/* Category */}
        <div className="w-full sm:w-36">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
            Category
          </label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
          >
            {SUBJECT_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          <button
            disabled={loading}
            type="submit"
            className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 transition"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : initial.id ? 'Update' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

// =============================================================================
export default function SubjectSetupBuilder() {
  // Subjects are this page's own data — fetched directly from the API.
  const [subjects, setSubjects] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSchoolSubjects()
      .then(res => { if (!cancelled && res?.success) setSubjects(res.data?.subjects ?? []); })
      .catch(err => console.error('[Subjects] load failed:', err))
      .finally(() => { if (!cancelled) setInitialLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Form state
  const [showForm,    setShowForm]    = useState(false);
  const [editingSubj, setEditingSubj] = useState(null); // subject object being edited

  // Filter
  const [search,          setSearch]          = useState('');
  const [filterCategory,  setFilterCategory]  = useState('all');

  // ─── Path A: Load standard subjects ────
  const handleLoadDefaults = async () => {
    if (!confirm('This will load all standard subjects into the school database. Continue?')) return;
    setLoading(true);
    const payload = {
      subjects: defaultSubjects.reduce((acc, name) => {
        // Collect all codes generated so far in the accumulator
        const existingCodes = acc.map(s => s.code);

        const newSubject = {
          name: name,
          code: autoGenerateCode(name, existingCodes),
          category: 'core',
        };

        return [...acc, newSubject];
      }, []),
    };

    try {
      const res = await bulkCreateSubjects(payload);
      if (res.success) {
        setSubjects(res.data.subjects);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load default subjects.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Path B: Create single subject ─────
  const handleCreate = async ({ name, code, category }) => {
    setLoading(true);
    try {
      const res = await createSubject({ name, code, category });
      if (res.success) {
        setSubjects(prev => [...prev, res.data.subject]);
        setShowForm(false);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to add subject.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Update existing subject ───
  const handleUpdate = async ({ name, code, category }) => {
    if (!editingSubj) return;
    setLoading(true);
    try {
      const res = await updateSubject(editingSubj.id, { name, code, category });
      if (res.success) {
        // Rebuild the subjects list with the updated entry in-place
        setSubjects(prev => prev.map(s =>
          s.id === editingSubj.id ? { ...s, name, code, category } : s
        ));
        setEditingSubj(null);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update subject.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Delete (unified) ──────────
  const handleDelete = async (subj) => {
    if (!confirm(`Delete "${subj.name}"? This removes it from the school database.`)) return;
    try {
      const res = await deleteSubjects(subj.id);
      if (res.success) {
        setSubjects(prev => prev.filter(s => s.id !== subj.id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Loading ───────────────────
  if (initialLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // ─── Zero-state ────────────────
  if (subjects.length === 0 && !showForm) {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-10">
            <span className="text-red-500 text-xs font-semibold">
              No subjects added yet
            </span>
            <h2 className="text-2xl font-bold text-gray-900 mt-1">Configure School Subjects</h2>
            <p className="text-gray-500 mt-2 max-w-lg mx-auto text-sm">
              Before building timetables, define the subjects offered at this school.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Hybrid path */}
            <div className="p-8 bg-white border border-gray-200 rounded-2xl hover:border-blue-300 transition-all text-center flex flex-col h-full">
              <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-black uppercase rounded-full tracking-wider mb-4">
                  Recommended
                </span>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Initialize Standard List</h3>
                <p className="text-sm text-gray-500 text-left">
                  Load dozens of standard Nigerian school subjects automatically.
                  Delete unused ones or add missing ones later.
                </p>
              </div>
              <div className="mt-auto pt-6">
                <button
                  onClick={handleLoadDefaults}
                  disabled={loading}
                  className="w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 cursor-pointer font-bold rounded-xl transition-colors flex justify-center items-center gap-2"
                >
                  {loading
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <Import className="w-5 h-5" />}
                  Import standard subjects
                </button>
              </div>
            </div>

            {/* Custom path */}
            <div className="p-8 bg-white border border-gray-200 rounded-2xl hover:border-gray-300 transition-all text-center flex flex-col h-full">
              <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 text-xs font-black uppercase rounded-full tracking-wider mb-4">
                  Custom
                </span>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Blank State</h3>
                <p className="text-sm text-gray-500 text-left">
                  Start with a blank slate and manually enter only the precise
                  subjects this institution requires.
                </p>
              </div>
              <div className="mt-auto pt-6">
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 cursor-pointer font-bold rounded-xl transition-colors flex justify-center items-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Add subjects manually
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Active / loaded view ──────
  const filtered = subjects.filter(s => {
    const matchesSearch =
      !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.code || '').toLowerCase().includes(search.toLowerCase());
    const matchesCat =
      filterCategory === 'all' || s.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="flex-1 bg-white p-6 rounded-xl border border-gray-200 overflow-hidden flex flex-col relative h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between mb-5 gap-3 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            School Subjects ({subjects.length})
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            School-wide subjects available for arm assignment
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {success && (
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded flex items-center gap-1">
              <CheckCircle2 size={14} /> Saved
            </span>
          )}

          {/* Category filter */}
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All categories</option>
            {SUBJECT_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search subjects…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* New Subject */}
          <button
            onClick={() => { setShowForm(true); setEditingSubj(null); }}
            className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition"
          >
            <Plus size={16} /> New Subject
          </button>
        </div>
      </div>

      {/* Inline form — New subject */}
      {showForm && !editingSubj && (
        <SubjectForm
          loading={loading}
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Inline form — Edit subject */}
      {editingSubj && (
        <SubjectForm
          initial={editingSubj}
          loading={loading}
          onSave={handleUpdate}
          onCancel={() => setEditingSubj(null)}
        />
      )}

      {/* Subject grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(s => (
            <div
              key={s.id}
              className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3 group hover:border-gray-300 hover:shadow-sm transition-all"
            >
              {/* Code badge */}
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs shrink-0 uppercase">
                {s.code || s.name.substring(0, 2).toUpperCase()}
              </div>

              {/* Name + category */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{s.name}</p>
                <CategoryPill category={s.category} />
              </div>

              {/* Actions (reveal on hover) */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                <button
                  onClick={() => {
                    setEditingSubj(s);
                    setShowForm(false);
                  }}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                  title="Edit subject"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => handleDelete(s)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                  title="Delete subject"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="col-span-full py-10 text-center text-gray-400 text-sm">
              {search || filterCategory !== 'all'
                ? 'No subjects match your filter.'
                : 'No subjects yet.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
