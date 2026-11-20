import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useTimetable, makeScheduleEntry } from './TimetableContext';
import { notify } from '@/components/patterns/toastBus.js';
import useMediaQuery from '@/components/patterns/useMediaQuery.js';
import { useAcademic } from '../../../../contexts/AcademicContext.jsx';
import { saveTimetableDraft } from './timetableAPIs';

// Components
import PalettePanel from './components/PalettePanel';
import WeeklyGrid from './components/WeeklyGrid';
import PropertiesPanel from './components/PropertiesPanel';
import PeriodBlock from './components/PeriodBlock';
import PeriodSetupWizard from './components/PeriodSetupWizard';
import MobileTray from './components/MobileTray';

const isBlockTarget = (c) => String(c.id).startsWith('blockdrop_');

/**
 * Prefer the lesson under the pointer for teacher drops (so a teacher lands on that exact entry
 * even in a crowded cell); for everything else use the cell or the palette's remove zone.
 */
function collisionDetection(args) {
  const hits = pointerWithin(args);
  if (args.active.data.current?.type === 'TEACHER') {
    const blocks = hits.filter(isBlockTarget);
    if (blocks.length) return blocks;
  }
  const rest = hits.filter(c => !isBlockTarget(c));
  return rest.length ? rest : hits;
}

/** Delete/Backspace only act when focus is on the page itself or inside the grid — never in a field or on a toolbar button. */
const keyboardInGridScope = () => {
  const el = document.activeElement;
  return !el || el === document.body || !!el.closest('[data-timetable-grid]');
};

/**
 * TimetableBuilder
 * ───────────────────────────────
 * The core 3-panel builder layout.
 * Manages DndContext, drag overlay, and auto-saving drafts.
 *
 * RENDERING DECISION:
 *   - periods.length === 0  → Always show PeriodSetupWizard.
 *     The wizard itself handles the "no class/term selected" state gracefully.
 *   - periods.length  >  0  → Show the full 3-panel timetable grid.
 *
 * NOTE: The previous condition also required `state.selectedClass &&
 * state.selectedTerm` before showing the wizard. This was wrong — it caused
 * the grid (with its "No class selected" placeholder) to render as the first
 * screen the user sees, completely bypassing the wizard. The guard now lives
 * inside PeriodSetupWizard where it belongs (disabling the Generate button).
 */
export default function TimetableBuilder({ resources }) {
  const { state, dispatch, selectedEntry, removeWithUndo } = useTimetable();
  const { currentYear, currentTerm } = useAcademic();
  const [activeDragData, setActiveDragData] = useState(null);
  // Below xl the inspector column is hidden; its content opens as a sheet when the user asks
  // (tapping a lesson or Details) — never just because a drop selected the new lesson.
  const isCompact = useMediaQuery('(max-width: 1279px)');
  const sheetOpen = isCompact && state.detailsOpen;
  const closeSheet = () => dispatch({ type: 'CLOSE_DETAILS' });
  useEffect(() => {
    if (!isCompact && state.detailsOpen) dispatch({ type: 'HIDE_DETAILS' });
  }, [isCompact, state.detailsOpen, dispatch]);

  // A small movement starts a mouse drag (so a click still selects); on touch, press and hold
  // briefly so scrolling the grid never picks a lesson up by accident.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  // Delete/Backspace removes the selected lesson (with Undo); Escape closes the sheet, tap mode or selection.
  useEffect(() => {
    const onKey = (e) => {
      // Another dialog (publish, duplicate, confirm) owns the keyboard; our own sheet does not.
      if (document.querySelector('[aria-modal="true"]:not([data-timetable-sheet])')) return;
      if (e.key === 'Escape') {
        if (state.detailsOpen) dispatch({ type: 'CLOSE_DETAILS' });
        else if (state.tapMode) dispatch({ type: 'CLEAR_TAP_MODE' });
        else dispatch({ type: 'DESELECT_ENTRY' });
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEntry && !state.isPublished && keyboardInGridScope()) {
        e.preventDefault();
        removeWithUndo(selectedEntry);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedEntry, state.isPublished, state.detailsOpen, state.tapMode, dispatch, removeWithUndo]);

  // Auto-save debouncer
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    // Only auto-save when we have a valid selection and we are in draft mode.
    // When the class has arms, arm must also be selected before saving.
    const classArms = resources.arms.filter(a => a.classId === state.selectedClass?.id);
    if (!state.selectedClass || !currentTerm || !currentYear || state.isPublished || state.loading.draft) return;
    const scope = `${state.selectedClass.id}:${state.selectedArm?.id ?? ''}:${currentTerm.id}`;
    if (state.loadedScope !== scope) return;
    if (classArms.length > 0 && !state.selectedArm) return;
    // Nothing to save yet if the grid hasn't been configured
    if (state.periods.length === 0) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      dispatch({ type: 'SET_SAVING', value: true });
      try {
        const payload = {
          classId: state.selectedClass.id,
          termId: currentTerm.id,
          academicYearId: currentYear.id,
          armId: state.selectedArm?.id ?? null,
          periods: state.periods,
          schedules: state.schedules,
        };
        const res = await saveTimetableDraft(payload);
        if (!res.success) throw new Error('Save rejected');
        dispatch({ type: 'SET_SAVED', at: res.data.savedAt, draftId: res.data.draftId });
      } catch (err) {
        console.error('Auto-save failed:', err);
        dispatch({ type: 'SAVE_FAILED' });
      }
    }, 4000); // 4-second debounce

    return () => clearTimeout(saveTimeoutRef.current);
  }, [state.schedules, state.selectedClass, state.selectedArm, currentTerm, currentYear, state.isPublished, state.periods, state.periodConfig, state.loading.draft, state.loadedScope, state.saveRetry, resources.arms, dispatch]);

  // ── DnD handlers ──────────────

  const handleDragStart = (e) => {
    setActiveDragData(e.active.data.current);
  };

  const handleDragEnd = (e) => {
    setActiveDragData(null);
    const { active, over } = e;

    if (!over) return;

    const sourceData = active.data.current;
    const dropData = over.data.current;

    if (!dropData) return;

    // Placed lesson dropped on the palette: remove it (with Undo).
    if (dropData.type === 'REMOVE_ZONE') {
      if (sourceData.type === 'PLACED_BLOCK') removeWithUndo(sourceData.entry);
      return;
    }

    // Teacher dropped on a specific lesson: assign to exactly that lesson.
    if (dropData.type === 'BLOCK') {
      if (sourceData.type === 'TEACHER') {
        const teacher = sourceData.payload;
        dispatch({
          type: 'UPDATE_SCHEDULE_ENTRY',
          payload: { id: dropData.entry.id, teacherId: teacher.id, teacherName: teacher.name },
        });
      }
      return;
    }

    if (dropData.type !== 'CELL') return;

    const cellEntries = state.schedules.filter(
        s => s.dayOfWeek === dropData.day && s.periodId === dropData.periodId
    );

    if (sourceData.type === 'SUBJECT') {
      const newEntry = makeScheduleEntry(state, sourceData.payload, dropData);
      dispatch({ type: 'ADD_SCHEDULE_ENTRY', payload: newEntry });
      dispatch({ type: 'SELECT_ENTRY', id: newEntry.id });
    } else if (sourceData.type === 'TEACHER') {
      const teacher = sourceData.payload;
      if (cellEntries.length === 1) {
        dispatch({
          type: 'UPDATE_SCHEDULE_ENTRY',
          payload: { id: cellEntries[0].id, teacherId: teacher.id, teacherName: teacher.name },
        });
      } else if (cellEntries.length === 0) {
        notify.info('Place a subject in this slot first, then drop the teacher on it.');
      } else {
        notify.info(`This slot has ${cellEntries.length} lessons. Drop ${teacher.name} onto the one you mean.`);
      }
    } else if (sourceData.type === 'ARM') {
      const arm = sourceData.payload;
      if (cellEntries.length === 1) {
        dispatch({
          type: 'UPDATE_SCHEDULE_ENTRY',
          payload: { id: cellEntries[0].id, armId: arm.name, armName: arm.name },
        });
      }
    } else if (sourceData.type === 'PLACED_BLOCK') {
      const { entry } = sourceData;
      if (entry.dayOfWeek === dropData.day && entry.periodId === dropData.periodId) return; // dropped where it was
      dispatch({
        type: 'MOVE_SCHEDULE_ENTRY',
        id: entry.id,
        day: dropData.day,
        periodId: dropData.periodId,
        periodNumber: dropData.periodNumber,
        startTime: dropData.startTime,
        endTime: dropData.endTime,
      });
      if (cellEntries.length > 0) {
        notify.info(`That slot already had a lesson. Remove one of the two, or move ${entry.subjectName} again.`);
      }
    }
  };


  const handleDragCancel = () => setActiveDragData(null);

  // ── Rendering decision ─────────
  //
  // Show the Period Setup Wizard whenever no periods are configured OR if a
  // timetable is already published (so we can show the "Already Published" notice).
  //
  // If the user chooses to "Continue to Editor" from the published notice,
  // we could potentially clear the isPublished flag or handle it via local state.
  // For now, we prioritize the redirect to Library as requested.

  const [overrideShowGrid, setOverrideShowGrid] = useState(false);
  const showWizard = (state.periods.length === 0 || state.isPublished) && !overrideShowGrid;

  // Reset override when selection changes
  useEffect(() => {
    setOverrideShowGrid(false);
  }, [state.selectedClass, state.selectedArm, currentTerm]);

  return (
      <DndContext
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
          collisionDetection={collisionDetection}
          sensors={sensors}
      >
        <div className="flex h-full w-full overflow-hidden ">
          {showWizard ? (
              <PeriodSetupWizard onContinue={() => { dispatch({ type: 'SET_DRAFT', schedules: state.schedules, periods: state.periods, draftId: null }); setOverrideShowGrid(true); }} resources={resources} />
          ) : (
              <>
                <PalettePanel resources={resources} />
                <WeeklyGrid activeDragData={activeDragData} />
                {isCompact ? (
                  <>
                    <MobileTray resources={resources} />
                    {sheetOpen && (
                      <BottomSheet onClose={closeSheet}>
                        <PropertiesPanel resources={resources} variant="sheet" onClose={closeSheet} />
                      </BottomSheet>
                    )}
                  </>
                ) : (
                  <PropertiesPanel resources={resources} />
                )}
              </>
          )}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDragData?.type === 'SUBJECT' ? (
              <div className="px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded shadow-2xl opacity-90 scale-105 pointer-events-none">
                {activeDragData.payload.name}
              </div>
          ) : activeDragData?.type === 'TEACHER' ? (
              <div className="px-3 py-1.5 bg-gray-800 text-white font-bold text-xs rounded shadow-2xl opacity-90 scale-105 pointer-events-none">
                Assign: {activeDragData.payload.name}
              </div>
          ) : activeDragData?.type === 'ARM' ? (
              <div className="px-3 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded shadow-2xl opacity-90 scale-105 pointer-events-none">
                Arm: {activeDragData.payload.name}
              </div>
          ) : activeDragData?.type === 'PLACED_BLOCK' ? (
              <div className="w-[120px] pointer-events-none opacity-80 scale-105 shadow-2xl">
                <PeriodBlock
                    entry={activeDragData.entry}
                    isSelected
                    readOnly
                    onSelect={() => {}}
                    onRemove={() => {}}
                />
              </div>
          ) : null}
        </DragOverlay>
      </DndContext>
  );
}

/**
 * Details sheet for screens without the inspector column.
 * Phones: a modal bottom sheet (backdrop tap closes it).
 * Tablets/small laptops (md+): a floating card with no backdrop, so the grid stays usable for dragging.
 */
function BottomSheet({ onClose, children }) {
  const isPhone = useMediaQuery('(max-width: 767px)');
  return createPortal(
    <div
      data-timetable-sheet
      role="dialog"
      aria-modal={isPhone ? 'true' : undefined}
      aria-label="Timetable details"
      className={`fixed z-[70] xl:hidden ${isPhone ? 'inset-0' : 'right-4 bottom-24 lg:bottom-4 w-[380px]'}`}
    >
      {isPhone && <div className="absolute inset-0 bg-gray-900/30" onClick={onClose} />}
      <div className={`flex flex-col bg-white shadow-2xl overflow-hidden ${isPhone
        ? 'absolute inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl animate-in slide-in-from-bottom duration-200 pb-[env(safe-area-inset-bottom)]'
        : 'max-h-[75vh] rounded-2xl border border-gray-200'}`}
      >
        {isPhone && <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-gray-200 shrink-0" />}
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}

