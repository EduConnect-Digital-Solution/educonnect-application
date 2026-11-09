import React, { useState, useEffect } from 'react';
import {createClasses, deleteClasses, getSchoolClasses} from '../../services/classAPIs';
import { createArms, deleteArms, updateArm, getClassArms } from '../../services/armAPIs';
import { registryStyles } from '../../../../../utils/imports';
import ArmSubjectsModal from './ArmSubjectsModal';
import {
  Layers,
  Search,
  CheckCircle2,
  Loader2,
  Plus,
  Link,
  Trash2,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Users,
  Pencil,
} from 'lucide-react';

// ─── Small helper ───────────────
const badge = (count, label) => (
  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
    <span className="bg-gray-100 rounded px-1.5 py-0.5 text-gray-600">{count}</span>
    {label}
  </span>
);

// =============================================================================
export default function ClassSetupBuilder() {
  // Classes + arms are this page's own data — fetched directly from the API.
  const [classes, setClasses] = useState([]);
  const [arms, setArms] = useState([]);
  const [armSubjectCounts, setArmSubjectCounts] = useState({}); // { [armId]: count }
  const [initialLoading, setInitialLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [search, setSearch] = useState('');

  // Load classes + their arms once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getSchoolClasses();
        if (cancelled || !res?.success) return;
        const cls = res.data?.classes ?? [];
        setClasses(cls);
        if (cls.length > 0) {
          const armResults = await Promise.all(cls.map(c => getClassArms(c.id)));
          if (cancelled) return;
          setArms(armResults.flatMap(r => r?.data?.arms ?? []));
        }
      } catch (e) {
        console.error('[Classes] load failed:', e);
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Matrix builder state
  const [baseLevels, setBaseLevels] = useState([]);
  const [streams, setStreams] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [newStreamInput, setNewStreamInput] = useState('');
  const [newBaseInput, setNewBaseInput] = useState('');

  // Builder toggle (when existing data is present)
  const [showBuilder, setShowBuilder] = useState(false);

  // Active-view state
  const [expandedClassId, setExpandedClassId] = useState(null);
  const [editingArmId, setEditingArmId] = useState(null);
  const [editArmName, setEditArmName] = useState('');
  const [addingArmToClassId, setAddingArmToClassId] = useState(null);
  const [newArmName, setNewArmName] = useState('');
  const [armSubjectsTarget, setArmSubjectsTarget] = useState(null); // { arm, classArms }

  // ─── 1. Base Levels ────────────
  const loadRegistryStyle = (styleId) => {
    const style = registryStyles.find(s => s.id === styleId);
    if (!style) return;
    setBaseLevels(style.levels);
    const newMatrix = {};
    style.levels.forEach(lv => { newMatrix[lv] = []; });
    setMatrix(newMatrix);
  };

  const addCustomBaseLevel = (e) => {
    e.preventDefault();
    const val = newBaseInput.trim();
    if (!val || baseLevels.includes(val)) return;
    setBaseLevels([...baseLevels, val]);
    setMatrix({ ...matrix, [val]: [] });
    setNewBaseInput('');
  };

  const removeBaseLevel = (lv) => {
    setBaseLevels(baseLevels.filter(x => x !== lv));
    const newM = { ...matrix };
    delete newM[lv];
    setMatrix(newM);
  };

  // ─── 2. Streams / Arms ──────────
  const addStream = (e) => {
    e.preventDefault();
    const val = newStreamInput.trim();
    if (!val || streams.includes(val)) return;
    setStreams([...streams, val]);
    setNewStreamInput('');
  };

  const removeStream = (streamName) => {
    setStreams(streams.filter(x => x !== streamName));
    const newM = { ...matrix };
    Object.keys(newM).forEach(lv => {
      newM[lv] = newM[lv].filter(s => s !== streamName);
    });
    setMatrix(newM);
  };

  // ─── 3. Matrix Mapping ──────────
  const toggleMatrixMapping = (level, stream) => {
    const current = matrix[level] || [];
    const newM = { ...matrix };
    newM[level] = current.includes(stream)
      ? current.filter(s => s !== stream)
      : [...current, stream];
    setMatrix(newM);
  };

  // ─── 4. Preview ─────────────────
  const getGeneratedClasses = () => {
    const result = [];
    baseLevels.forEach(lv => {
      const mapped = matrix[lv] || [];
      if (mapped.length === 0) {
        result.push({ baseLevel: lv, arm: null, name: lv });
      } else {
        mapped.forEach(st => result.push({ baseLevel: lv, arm: st, name: `${lv} ${st}` }));
      }
    });
    return result;
  };

  const uniqueBaseCount = baseLevels.length;
  const totalArmCount = getGeneratedClasses().filter(c => c.arm !== null).length;

  // ─── 5. Two-phase Save ──────────
  /**
   * Phase 1: POST /api/academic/classes — save each unique base level.
   * Phase 2: POST /api/academic/arms    — save arms referencing the returned classIds.
   *
   * This cleanly separates the Class and Arm entities as required by newFeatures.md.
   */
  const handleSaveMatrix = async () => {
    if (uniqueBaseCount === 0) return alert('Define at least one base level before saving.');
    if (!confirm(`Save ${uniqueBaseCount} class(es) and their arm configurations?`)) return;

    setLoading(true);
    try {
      // ── Phase 1: Create base class levels ─────────────────────────────────
      const classPayload = {
        classes: baseLevels.map((lv, idx) => ({ name: lv, level: idx + 1 })),
      };
      const classRes = await createClasses(classPayload);
      if (!classRes.success) throw new Error(classRes.message || 'Failed to create classes');

      const createdClasses = classRes.data.classes;
      setClasses(createdClasses);

      // ── Phase 2: Create arms (only where streams are mapped) ───────────────
      const armsToCreate = [];
      baseLevels.forEach(lv => {
        const classObj = createdClasses.find(c => c.name === lv);
        if (!classObj) return;
        const mappedStreams = matrix[lv] || [];
        mappedStreams.forEach(stream => {
          armsToCreate.push({ classId: classObj.id, name: stream });
        });
      });

      if (armsToCreate.length > 0) {
        const armRes = await createArms({ arms: armsToCreate });
        if (armRes.success) {
          setArms(armRes.data.arms);
        }
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert(`Save failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ─── 6. Delete (active-view) ────
  const handleDeleteClass = async (cls) => {
    if (!confirm(`Remove "${cls.name}" and all its arms? This cannot be undone.`)) return;
    try {
      const res = await deleteClasses(cls.id);
      if (res.success) {
        setClasses(prev => prev.filter(c => c.id !== cls.id));
        setArms(prev => prev.filter(a => a.classId !== cls.id));
        if (expandedClassId === cls.id) setExpandedClassId(null);
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteArm = async (arm) => {
    if (!confirm(`Remove arm "${arm.name}"?`)) return;
    try {
      const res = await deleteArms(arm.id);
      if (res.success) setArms(prev => prev.filter(a => a.id !== arm.id));
    } catch (e) { console.error(e); }
  };

  // ─── 7. Edit arm name (optimistic + API) ─
  const startEditArm = (arm) => {
    setEditingArmId(arm.id);
    setEditArmName(arm.name);
  };

  const commitEditArm = async (e) => {
    e.preventDefault();
    const name = editArmName.trim();
    if (!name) return;
    const id = editingArmId;
    setEditingArmId(null);
    setEditArmName('');
    setArms(prev => prev.map(a => (a.id === id ? { ...a, name } : a))); // optimistic
    try {
      await updateArm(id, { name });
    } catch (err) {
      console.error('[ClassSetupBuilder] updateArm failed:', err);
    }
  };

  // ─── 8b. Add arm to existing class ───────
  const handleAddArm = async (e, cls) => {
    e.preventDefault();
    const name = newArmName.trim();
    if (!name) return;
    setNewArmName('');
    setAddingArmToClassId(null);
    try {
      const res = await createArms({ arms: [{ classId: cls.id, name }] });
      if (res.success && res.data?.arms?.length > 0) {
        setArms(prev => [...prev, ...res.data.arms]);
      }
    } catch (err) {
      console.error('[ClassSetupBuilder] createArms failed:', err);
    }
  };

  // ─── 8c. Enter builder mode pre-populated from existing data ──────────────────
  const enterBuilderMode = () => {
    const levels = classes.map(c => c.name);
    const armNames = [...new Set(arms.map(a => a.name))];
    const mat = {};
    levels.forEach(lv => {
      const cls = classes.find(c => c.name === lv);
      mat[lv] = cls ? arms.filter(a => a.classId === cls.id).map(a => a.name) : [];
    });
    setBaseLevels(levels);
    setStreams(armNames);
    setMatrix(mat);
    setShowBuilder(true);
  };

  // ─── 8. Arms-subjects modal ─────
  const openArmSubjects = (arm) => {
    const classArms = arms.filter(a => a.classId === arm.classId);
    setArmSubjectsTarget({ arm, classArms });
  };

  // ─── Derived data ───────────────
  const hasExistingData = classes.length > 0 && !showBuilder;
  const armsForClass = (classId) => arms.filter(a => a.classId === classId);

  // ─── Loading ───────────────────
  if (initialLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }


  // ───────────────────────────────
  // ACTIVE DATA VIEW (classes already saved)
  // ───────────────────────────────
  if (hasExistingData) {
    const filtered = classes.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <>
        <div className="flex-1 bg-white p-6 rounded-xl border border-gray-200 flex flex-col relative h-full">
          {/* Header */}
          <div className="flex flex-wrap md:flex-nowrap items-center justify-between mb-6">
            <div className={`w-full`}>
              <h2 className="text-lg font-bold text-gray-800">
                School Class Structure ({classes.length})
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage classes and their arm-level subject assignments.
              </p>
            </div>

            <div className="grid grid-cols-1 w-full md:grid-cols-2 items-center gap-4 pt-5 sm:mt-0">
              {success && (
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded flex items-center gap-1">
                  <CheckCircle2 size={14} /> Saved
                </span>
              )}
              <div className="relative w-full justify-center">
                <Search className="absolute left-3 top-2.5 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search classes…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2  border w-full border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <button
                onClick={enterBuilderMode}
                className="px-4 py-2 w-full border bg-brand cursor-pointer text-white text-sm font-semibold rounded-lg flex items-center content-center justify-center gap-2 transition"
              >
                <Link size={16} /> Edit Structure
              </button>
            </div>
          </div>

          {/* Class list */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {filtered.map(cls => {
              const arms = armsForClass(cls.id);
              const isExpanded = expandedClassId === cls.id;

              return (
                <div
                  key={cls.id}
                  className="border border-gray-200 rounded-xl overflow-hidden"
                >
                  {/* Class row */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
                    {/* Expand toggle */}
                    <button
                      onClick={() => setExpandedClassId(isExpanded ? null : cls.id)}
                      className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
                    >
                      {isExpanded
                        ? <ChevronDown size={16} />
                        : <ChevronRight size={16} />}
                    </button>

                    {/* Class name */}
                    <div className="flex-1 flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Layers size={14} className="text-blue-600" />
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-gray-900 text-sm">{cls.name}</span>
                        {cls.level && (
                          <span className="ml-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                            Level {cls.level}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arm count badge */}
                    <div className="flex items-center gap-3 shrink-0">
                      {badge(arms.length, arms.length === 1 ? 'arm' : 'arms')}
                    </div>

                    {/* Delete class */}
                    <button
                      onClick={() => handleDeleteClass(cls)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                      title="Delete class"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Arms accordion */}
                  {isExpanded && (
                    <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 space-y-2">
                      {arms.length === 0 && addingArmToClassId !== cls.id && (
                        <p className="text-xs text-gray-400 italic py-2 text-center">
                          No arms defined. Use the button below to add one.
                        </p>
                      )}
                      {arms.length > 0 && arms.map(arm => {
                        const subjectCount = armSubjectCounts[arm.id] ?? 0;

                        return (
                          <div
                            key={arm.id}
                            className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2 group"
                          >
                            {/* Arm indicator */}
                            <div className="w-6 h-6 rounded bg-indigo-50 flex items-center justify-center shrink-0">
                              <Users size={11} className="text-indigo-500" />
                            </div>

                            {/* Arm name / inline edit */}
                            {editingArmId === arm.id ? (
                              <form
                                onSubmit={commitEditArm}
                                className="flex-1 flex gap-2"
                              >
                                <input
                                  autoFocus
                                  value={editArmName}
                                  onChange={e => setEditArmName(e.target.value)}
                                  className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                                <button
                                  type="submit"
                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingArmId(null)}
                                  className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </form>
                            ) : (
                              <>
                                <span className="flex-1 text-sm font-semibold text-gray-800">
                                  {arm.name}
                                </span>

                                {/* Manage subjects */}
                                <button
                                  onClick={() => openArmSubjects(arm)}
                                  className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                                >
                                  <BookOpen size={11} />
                                  View Linked Subjects
                                </button>

                                {/* Edit arm name */}
                                <button
                                  onClick={() => startEditArm(arm)}
                                  className="p-1 text-gray-300 hover:text-gray-600 rounded opacity-0 group-hover:opacity-100 transition-all"
                                  title="Rename arm"
                                >
                                  <Pencil size={12} />
                                </button>

                                {/* Delete arm */}
                                <button
                                  onClick={() => handleDeleteArm(arm)}
                                  className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                  title="Delete arm"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })}
                      {addingArmToClassId === cls.id ? (
                        <form onSubmit={(e) => handleAddArm(e, cls)} className="flex gap-2 pt-1">
                          <input
                            autoFocus
                            placeholder="Arm name (e.g. A, B, Science)"
                            value={newArmName}
                            onChange={e => setNewArmName(e.target.value)}
                            className="flex-1 px-2 py-1.5 text-sm border border-blue-300 rounded outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                          <button type="submit" className="px-3 py-1 text-xs bg-blue-600 text-white rounded font-semibold hover:bg-blue-700">Add</button>
                          <button type="button" onClick={() => { setAddingArmToClassId(null); setNewArmName(''); }} className="px-3 py-1 text-xs border border-gray-200 rounded hover:bg-gray-100">Cancel</button>
                        </form>
                      ) : (
                        <button
                          onClick={() => setAddingArmToClassId(cls.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-gray-300 hover:border-blue-300 transition-colors w-full justify-center"
                        >
                          <Plus size={12} /> Add Arm
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && (
              <p className="py-12 text-center text-gray-400 text-sm">
                No classes match "{search}"
              </p>
            )}
          </div>
        </div>

        {/* Arm Subjects Modal */}
        {armSubjectsTarget && (
          <ArmSubjectsModal
            arm={armSubjectsTarget.arm}
            classArms={armSubjectsTarget.classArms}
            onClose={() => setArmSubjectsTarget(null)}
            onSubjectsChange={(armId, count) =>
              setArmSubjectCounts(prev => ({ ...prev, [armId]: count }))
            }
          />
        )}
      </>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 flex flex-col relative h-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between px-4 md:px-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Academic Taxonomy</h2>
          <p className="text-sm text-gray-500 mt-1">
            Map arms to base levels. Classes and arms are saved as separate entities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right mr-4">
            <div className="text-sm text-gray-500 font-semibold mb-0.5 uppercase tracking-wider">
              Output
            </div>
            <div className="text-lg font-black text-blue-600">
              {uniqueBaseCount}{' '}
              <span className="text-sm text-gray-500 font-bold">
                class{uniqueBaseCount !== 1 ? 'es' : ''}
              </span>
              {totalArmCount > 0 && (
                <span className="text-sm text-gray-500 font-bold ml-2">
                  + {totalArmCount} arm{totalArmCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          {classes.length > 0 && (
            <button
              onClick={() => setShowBuilder(false)}
              className="px-4 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-100 font-semibold rounded-lg transition text-sm"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSaveMatrix}
            disabled={loading || uniqueBaseCount === 0}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg transition shadow-sm flex items-center gap-2"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            Confirm Structure
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-20">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 min-h-full items-stretch">

          {/* Left Sidebar */}
          <div className="w-full lg:w-[350px] shrink-0 flex flex-col gap-6">

            {/* Registry Presets */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-xs uppercase font-black text-gray-400 tracking-widest mb-3">
                1. Select Base Structure
              </h3>
              <div className="space-y-2">
                {registryStyles.map(rs => (
                  <button
                    key={rs.id}
                    onClick={() => loadRegistryStyle(rs.id)}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition group"
                  >
                    <div className="font-bold text-sm text-gray-800 flex justify-between items-center">
                      {rs.name}
                      <ArrowRight
                        size={14}
                        className="text-gray-300 group-hover:text-blue-500 transition-transform group-hover:translate-x-1"
                      />
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1 line-clamp-1">
                      {rs.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Levels */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
              <h3 className="text-xs uppercase font-black text-gray-400 tracking-widest mb-3">
                Add Custom Base
              </h3>
              <form onSubmit={addCustomBaseLevel} className="flex gap-2 mb-3">
                <input
                  required
                  placeholder="e.g. Advanced Placement"
                  value={newBaseInput}
                  onChange={e => setNewBaseInput(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-1.5 text-sm outline-none focus:ring-2"
                />
                <button
                  type="submit"
                  className="px-3 bg-gray-900 text-white rounded text-sm font-bold hover:bg-black"
                >
                  <Plus size={16} />
                </button>
              </form>
              {baseLevels.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  {baseLevels.map(lv => (
                    <span
                      key={lv}
                      className="inline-flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded text-xs font-semibold text-gray-700"
                    >
                      {lv}
                      <button
                        onClick={() => removeBaseLevel(lv)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Streams Configurator */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col flex-1 min-h-[200px]">
              <h3 className="text-xs uppercase font-black text-gray-400 tracking-widest mb-3">
                2. Define Arms / Streams
              </h3>
              <p className="text-[11px] text-gray-500 mb-3 leading-tight hidden sm:block">
                Suffixes appended to classes (e.g. "A", "Science", "Commercial").
              </p>

              <form onSubmit={addStream} className="flex gap-2 mb-3">
                <input
                  required
                  placeholder="e.g. Science"
                  value={newStreamInput}
                  onChange={e => setNewStreamInput(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-1.5 text-sm outline-none focus:ring-2"
                />
                <button
                  type="submit"
                  className="px-3 bg-gray-900 text-white rounded text-sm font-bold hover:bg-black"
                >
                  <Plus size={16} />
                </button>
              </form>

              <div className="flex-1 bg-gray-50 rounded-lg border border-gray-100 p-2 flex flex-col gap-1.5 overflow-y-auto">
                {streams.length === 0 ? (
                  <div className="text-center text-xs text-gray-400 py-4 italic">
                    No streams defined.
                  </div>
                ) : (
                  streams.map(stream => (
                    <div
                      key={stream}
                      className="flex justify-between items-center bg-white px-3 py-2 rounded border border-gray-200 shadow-sm"
                    >
                      <span className="text-sm font-bold text-gray-800">{stream}</span>
                      <button
                        onClick={() => removeStream(stream)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Matrix */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden min-h-[400px]">
            <div className="p-4 border-b border-gray-200 bg-gray-50/50">
              <h3 className="text-sm font-bold text-gray-800">3. Map The Matrix</h3>
              <p className="text-xs text-gray-500">
                Toggle which arms apply to which base levels. Empty rows become standalone classes.
              </p>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto p-4 hide-scrollbar">
              {baseLevels.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center border-2 border-dashed border-gray-200">
                    <Layers className="text-gray-300 w-8 h-8" />
                  </div>
                  <p className="text-sm font-medium">Adopt a base registry to begin mapping.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="p-3 bg-gray-50 border-b border-gray-200 text-xs font-black uppercase text-gray-500 tracking-wider sticky top-0 left-0 z-10 w-48">
                        Base Level
                      </th>
                      {streams.map(st => (
                        <th
                          key={st}
                          className="p-3 bg-gray-50 border-b border-gray-200 text-xs font-black uppercase text-gray-500 tracking-wider sticky top-0 text-center min-w-20"
                        >
                          {st}
                        </th>
                      ))}
                      {streams.length === 0 && (
                        <th className="p-3 bg-gray-50 border-b border-gray-200 text-xs text-gray-400 sticky top-0">
                          ← Add arms first
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {baseLevels.map(lv => (
                      <tr key={lv} className="group hover:bg-blue-50/30">
                        <td className="p-3 border-b border-gray-100 text-sm font-bold text-gray-800 bg-white sticky left-0 group-hover:bg-blue-50/30 transition-colors">
                          {lv}
                        </td>
                        {streams.map(st => {
                          const isMapped = matrix[lv]?.includes(st);
                          return (
                            <td key={st} className="p-3 border-b border-gray-100 text-center">
                              <button
                                onClick={() => toggleMatrixMapping(lv, st)}
                                className={`w-6 h-6 mx-auto rounded flex items-center justify-center border transition-all ${isMapped
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm scale-110'
                                    : 'bg-gray-50 border-gray-200 text-transparent hover:border-blue-400 group-hover:bg-white'
                                  }`}
                              >
                                <CheckCircle2 size={14} />
                              </button>
                            </td>
                          );
                        })}
                        {streams.length === 0 && (
                          <td className="p-3 border-b border-gray-100 text-xs text-gray-400 italic">
                            standalone class
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
