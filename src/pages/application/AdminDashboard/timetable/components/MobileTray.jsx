import React from 'react';
import { BookOpen, SlidersHorizontal, X } from 'lucide-react';
import { useTimetable, getSubjectColor } from '../TimetableContext';

/**
 * MobileTray
 * ───────────────────────────────
 * Bottom bar for screens without the palette (below lg). Dragging is awkward with a thumb,
 * so subjects are placed by tapping: tap a subject here, then tap a slot on the grid.
 * Also opens the details sheet (publish, conflicts, draft actions). Between lg and xl the palette
 * is visible, so only a floating Details button is shown.
 */
export default function MobileTray({ resources }) {
  const { state, dispatch, conflicts } = useTimetable();
  const { subjects = [], arms = [] } = resources;
  const { tapMode } = state;

  const classArms = state.selectedClass ? arms.filter(a => a.classId === state.selectedClass.id) : [];
  const needsArm = classArms.length > 0 && !state.selectedArm;
  const canPlace = !state.isPublished && state.selectedClass && !needsArm;
  const errorCount = conflicts.filter(c => c.severity === 'error').length;
  const badge = errorCount > 0 && (
    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
      {errorCount}
    </span>
  );

  return (
    <>
    <button
      type="button"
      onClick={() => dispatch({ type: 'OPEN_DETAILS' })}
      className="hidden lg:flex xl:hidden fixed bottom-5 right-5 z-40 items-center gap-1.5 px-4 py-2.5 rounded-full bg-gray-900 text-white text-sm font-semibold shadow-lg"
    >
      <SlidersHorizontal size={15} /> Details
      {badge}
    </button>
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
      {tapMode && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-blue-600 text-white text-sm">
          <span className="truncate">
            {tapMode.mode === 'place'
              ? <>Tap a slot to place <strong>{tapMode.subject.name}</strong></>
              : <>Tap the new slot for <strong>{tapMode.entry.subjectName}</strong></>}
          </span>
          <button
            type="button"
            onClick={() => dispatch({ type: 'CLEAR_TAP_MODE' })}
            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md bg-white/15 font-semibold"
          >
            <X size={14} /> Cancel
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex-1 flex gap-2 overflow-x-auto" aria-label="Subjects">
          {!canPlace ? (
            <p className="text-xs text-gray-400 py-2">
              {state.isPublished ? 'Published. Unlock it in Details to edit.' : needsArm ? 'Choose an arm to start placing subjects.' : 'Choose a class to start.'}
            </p>
          ) : subjects.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">No subjects for this class yet.</p>
          ) : subjects.map(subject => {
            const color = getSubjectColor(subject.id);
            const active = tapMode?.mode === 'place' && tapMode.subject.id === subject.id;
            return (
              <button
                key={subject.id}
                type="button"
                aria-pressed={active}
                onClick={() => dispatch(active ? { type: 'CLEAR_TAP_MODE' } : { type: 'SET_TAP_MODE', tapMode: { mode: 'place', subject } })}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-semibold ${color.bg} ${color.text} ${color.border} ${active ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
              >
                <BookOpen size={12} className="opacity-70" />
                {subject.name}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => dispatch({ type: 'OPEN_DETAILS' })}
          className="relative shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700"
        >
          <SlidersHorizontal size={14} /> Details
          {badge}
        </button>
      </div>
    </div>
    </>
  );
}
