import React, { useState } from 'react';
import { useTimetable, uid } from '../TimetableContext';
import { useAcademic } from '../../../../../contexts/AcademicContext.jsx';
import { saveTimetableDraft } from '../timetableAPIs';
import { Clock, Plus, Trash2, Settings2, Loader2, ArrowRight, AlertCircle, BookOpen, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * PeriodSetupWizard
 * ───────────────────────────────
 * First-time configuration screen shown whenever no periods exist for the
 * selected class/term. It is also the screen shown on initial page load
 * (before any class is selected) — it gracefully handles that case by
 * disabling the Generate button and surfacing a clear instruction.
 *
 * ADDITION: Detects if a published timetable already exists. If so, prevents
 * new grid generation and offers a direct link to view it in the Library.
 */
export default function PeriodSetupWizard({ onContinue, resources }) {
  const { state, dispatch } = useTimetable();
  const { currentYear, currentTerm } = useAcademic();
  const navigate = useNavigate();

  const [startTime, setStartTime] = useState('08:00');
  const [periodDuration, setPeriodDuration] = useState(45);
  const [totalPeriods, setTotalPeriods] = useState(8);
  const [saving, setSaving] = useState(false);

  const [breaks, setBreaks] = useState([
    { id: uid(), afterPeriod: 2, durationMinutes: 30, label: 'Short Break' },
    { id: uid(), afterPeriod: 5, durationMinutes: 45, label: 'Lunch Break' },
  ]);

  // Arms belonging to the currently selected class (empty = whole-class timetable)
  const classArms = state.selectedClass
    ? (resources?.arms ?? []).filter(a => a.classId === state.selectedClass.id)
    : [];
  const classHasArms = classArms.length > 0;

  // Generate is blocked until class, term, and (when class has arms) arm are all chosen.
  const canGenerate = Boolean(
    state.selectedClass &&
    currentTerm &&
    (!classHasArms || state.selectedArm)
  );

  // ── Published Check ──────────
  // If the state says it's published, we shouldn't show the wizard for creation.
  const isPublished = state.isPublished;

  const handleGoToLibrary = () => {
    if (!state.selectedClass || !currentTerm) return;

    let url = `/dashboard/admin/academics/timetables?classId=${state.selectedClass.id}&termId=${currentTerm.id}`;
    if (state.selectedArm) {
      url += `&armId=${state.selectedArm.id}`;
    }
    navigate(url);
  };

  const addBreak = () => {
    setBreaks([...breaks, { id: uid(), afterPeriod: 1, durationMinutes: 30, label: 'Break' }]);
  };

  const updateBreak = (id, field, value) => {
    setBreaks(breaks.map(b => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const removeBreak = (id) => {
    setBreaks(breaks.filter(b => b.id !== id));
  };

  // ── Time math ────────────────
  const addMinutesToTime = (timeStr, minsToAdd) => {
    const [hours, mins] = timeStr.split(':').map(Number);
    const date = new Date(2000, 0, 1, hours, mins + minsToAdd);
    return date.toTimeString().slice(0, 5);
  };

  const generatePeriods = () => {
    let currentStartTime = startTime;
    const generated = [];
    let periodNumber = 1;

    for (let i = 1; i <= totalPeriods; i++) {
      const endTime = addMinutesToTime(currentStartTime, periodDuration);
      generated.push({
        id: `p_${uid()}`,
        number: periodNumber,
        label: `Period ${periodNumber}`,
        start: currentStartTime,
        end: endTime,
        isBreak: false,
      });
      currentStartTime = endTime;
      periodNumber++;

      const scheduledBreaks = breaks.filter(b => b.afterPeriod === i);
      for (const b of scheduledBreaks) {
        const breakEndTime = addMinutesToTime(currentStartTime, b.durationMinutes);
        generated.push({
          id: `b_${uid()}`,
          number: periodNumber - 1,
          label: b.label || 'Break',
          start: currentStartTime,
          end: breakEndTime,
          isBreak: true,
        });
        currentStartTime = breakEndTime;
      }
    }

    return generated;
  };

  // ── Generate & save ──────────
  const handleGenerate = async () => {
    // Guard: this should not be callable without class/term, but be defensive.
    if (!state.selectedClass || !currentTerm) return;

    const generatedPeriods = generatePeriods();
    setSaving(true);

    try {
      // 1. Update local state immediately so the grid appears
      dispatch({ type: 'SET_PERIODS', payload: generatedPeriods });
      
      // 2. Save the period configuration metadata for API calls
      const periodConfigMetadata = {
        periodConfigId: `pc_${uid()}`,
        schoolStart: startTime,
        periodDuration: periodDuration,
        totalPeriods: totalPeriods,
        breaks: breaks.map(b => ({
          breakAfter: b.afterPeriod,
          breakDuration: b.durationMinutes,
          label: b.label,
        })),
      };
      dispatch({ type: 'SET_PERIOD_CONFIG', payload: periodConfigMetadata });

      // 3. Persist the new structure as a fresh draft
      const payload = {
        classId: state.selectedClass.id,
        termId: currentTerm.id,
        academicYearId: currentYear?.id,
        armId: state.selectedArm?.id ?? null,
        periods: generatedPeriods,
        periodConfig: periodConfigMetadata,
        schedules: [],
      };

      const res = await saveTimetableDraft(payload);
      if (res.success) {
        dispatch({ type: 'SET_SAVED', at: res.data.savedAt, draftId: res.data.draftId });
      }
    } catch (err) {
      console.error('Failed to save generated periods:', err);
      alert('Failed to save periods. Please try again.');
      // Revert so the wizard stays visible and the user can retry
      dispatch({ type: 'SET_PERIODS', payload: [] });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────
  return (
      <div className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
        <div className=" max-w-4xl w-full p-8 rounded-2xl">

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-900">Period Configuration Wizard</h2>
            <p className="text-gray-500 mt-2">
              {state.selectedClass && state.selectedArm
              ? <>Let's structure the timetable grid for <span className="font-bold text-gray-700">{state.selectedClass.name} — {state.selectedArm.name}</span> before adding subjects.</>
              : state.selectedClass
                  ? <>Let's structure the timetable grid for <span className="font-bold text-gray-700">{state.selectedClass.name}</span> before adding subjects.</>
                  : 'Configure the daily period structure for your school timetable.'}
            </p>
          </div>

          {/* Published Timetable Alert */}
          {isPublished && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 mb-8 text-center animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen size={32} />
                </div>
                <h3 className="text-xl font-bold text-emerald-900 mb-2">Timetable Already Published</h3>
                <p className="text-emerald-700 mb-8 max-w-md mx-auto">
                    A published timetable already exists for <span className="font-bold">{state.selectedClass?.name}{state.selectedArm ? ` — ${state.selectedArm.name}` : ''}</span> for this term. 
                    You can view it in the library or continue to the grid if you wish to edit it (which will convert it back to a draft).
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                        onClick={handleGoToLibrary}
                        className="w-full sm:w-auto px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-200"
                    >
                        View in Library <ExternalLink size={18} />
                    </button>
                    <button
                        onClick={onContinue}
                        className="w-full sm:w-auto px-6 py-3 bg-white text-emerald-700 border border-emerald-200 font-bold rounded-xl hover:bg-emerald-100 transition-all"
                    >
                        Continue to Editor
                    </button>
                </div>
            </div>
          )}

          {!isPublished && (
            <>
              {/* Callout: prompt user to select a class/term if not yet done */}
              {!canGenerate && (
                  <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      {!state.selectedClass || !currentTerm ? (
                        <>
                          <p className="font-semibold mb-0.5">Select a class and term to continue</p>
                          <p className="opacity-80">
                            Use the <span className="font-semibold">Target Class</span> selector in the toolbar above, and ensure an academic year and term are active.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold mb-0.5">Select an arm / stream to continue</p>
                          <p className="opacity-80">
                            <span className="font-semibold">{state.selectedClass.name}</span> has multiple streams. Use the <span className="font-semibold">Target Arm</span> selector in the toolbar above to choose which stream this timetable is for.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
              )}

              <div className="space-y-8">
                {/* General Period Settings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      School Starts At
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input
                          type="time"
                          value={startTime}
                          onChange={e => setStartTime(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Period Duration
                    </label>
                    <div className="relative">
                      <input
                          type="number"
                          min="5"
                          max="180"
                          value={periodDuration}
                          onChange={e => setPeriodDuration(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none text-right pr-12"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400">MINS</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Total Periods
                    </label>
                    <div className="relative">
                      <input
                          type="number"
                          min="1"
                          max="25"
                          value={totalPeriods}
                          onChange={e => setTotalPeriods(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none text-right pr-16"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400">PERIODS</span>
                    </div>
                  </div>
                </div>

                <div className="w-full h-px bg-gray-100" />

                {/* Breaks Configuration */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Breaks &amp; Lunches
                    </label>
                    <button
                        onClick={addBreak}
                        className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Plus size={14} /> Add Break
                    </button>
                  </div>

                  {breaks.length === 0 ? (
                      <div className="p-4 bg-gray-50 border border-gray-200 border-dashed rounded-lg text-center text-sm text-gray-500">
                        No breaks configured. Periods will run back-to-back.
                      </div>
                  ) : (
                      <div className="space-y-3">
                        {breaks.map(b => (
                            <div
                                key={b.id}
                                className="flex flex-wrap md:flex-nowrap items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                            >
                              <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">
                                Break occurs after
                              </span>

                              <select
                                  value={b.afterPeriod}
                                  onChange={e => updateBreak(b.id, 'afterPeriod', Number(e.target.value))}
                                  className="bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                              >
                                {Array.from({ length: totalPeriods }).map((_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                      Period {i + 1}
                                    </option>
                                ))}
                              </select>

                              <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">for</span>

                              <div className="relative">
                                <input
                                    type="number"
                                    value={b.durationMinutes}
                                    onChange={e => updateBreak(b.id, 'durationMinutes', Number(e.target.value))}
                                    className="bg-white border border-gray-300 rounded pl-2 pr-10 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-24 text-right"
                                />
                                <span className="absolute right-2 top-1.5 text-[10px] font-bold text-gray-400">MINS</span>
                              </div>

                              <span className="text-sm font-semibold text-gray-600 whitespace-nowrap flex-1 text-right">
                                Label:
                              </span>

                              <input
                                  type="text"
                                  value={b.label}
                                  onChange={e => updateBreak(b.id, 'label', e.target.value)}
                                  className="bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-32"
                              />

                              <button
                                  onClick={() => removeBreak(b.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors ml-auto"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                        ))}
                      </div>
                  )}
                </div>

                {/* Generate Action */}
                <button
                    onClick={handleGenerate}
                    disabled={saving || !canGenerate}
                    className="w-3/5 mx-auto rounded-xs py-3.5 bg-brand cursor-pointer text-white font-bold outline-none focus:ring-4 focus:ring-blue-500/30 transition-all flex justify-center items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Generating Grid...
                      </>
                  ) : !canGenerate ? (
                      <>Select a class &amp; term above to generate</>
                  ) : (
                      <>
                        Generate Working Grid <ArrowRight className="w-5 h-5" />
                      </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
  );
}
