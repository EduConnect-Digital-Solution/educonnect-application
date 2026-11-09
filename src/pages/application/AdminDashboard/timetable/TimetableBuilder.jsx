import React, { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
} from '@dnd-kit/core';
import { useTimetable, uid } from './TimetableContext';
import { useAcademic } from '../../../../contexts/AcademicContext.jsx';
import { saveTimetableDraft } from './timetableAPIs';

// Components
import PalettePanel from './components/PalettePanel';
import WeeklyGrid from './components/WeeklyGrid';
import PropertiesPanel from './components/PropertiesPanel';
import PeriodBlock from './components/PeriodBlock';
import PeriodSetupWizard from './components/PeriodSetupWizard';

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
  const { state, dispatch } = useTimetable();
  const { currentYear, currentTerm } = useAcademic();
  const [activeDragData, setActiveDragData] = useState(null);

  // Auto-save debouncer
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    // Only auto-save when we have a valid selection and we are in draft mode.
    // When the class has arms, arm must also be selected before saving.
    const classArms = resources.arms.filter(a => a.classId === state.selectedClass?.id);
    if (!state.selectedClass || !currentTerm || state.isPublished) return;
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
          schedules: state.schedules,
        };
        const res = await saveTimetableDraft(payload);
        if (res.success) {
          dispatch({ type: 'SET_SAVED', at: res.data.savedAt, draftId: res.data.draftId });
        }
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    }, 4000); // 4-second debounce

    return () => clearTimeout(saveTimeoutRef.current);
  }, [state.schedules, state.selectedClass, state.selectedArm, currentTerm, currentYear, state.isPublished, state.periods.length, resources.arms, dispatch]);

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

    if (!dropData || dropData.type !== 'CELL') return;

    if (sourceData.type === 'SUBJECT') {
      const subject = sourceData.payload;
      const newEntry = {
        id: uid(),
        classId: state.selectedClass.id,
        className: state.selectedClass.name,
        armId: state.selectedArm?.id ?? null,
        armName: state.selectedArm?.name ?? null,
        dayOfWeek: dropData.day,
        periodId: dropData.periodId,
        periodNumber: dropData.periodNumber,
        startTime: dropData.startTime,
        endTime: dropData.endTime,
        subjectId: subject.id,
        subjectName: subject.name,
        teacherId: null,
        teacherName: null,
      };
      dispatch({ type: 'ADD_SCHEDULE_ENTRY', payload: newEntry });
      dispatch({ type: 'SELECT_ENTRY', id: newEntry.id });
    } else if (sourceData.type === 'TEACHER') {
      const teacher = sourceData.payload;
      const cellEntries = state.schedules.filter(
          s => s.dayOfWeek === dropData.day && s.periodId === dropData.periodId
      );
      if (cellEntries.length === 1) {
        dispatch({
          type: 'UPDATE_SCHEDULE_ENTRY',
          payload: { id: cellEntries[0].id, teacherId: teacher.id, teacherName: teacher.name },
        });
      }
    } else if (sourceData.type === 'ARM') {
      const arm = sourceData.payload;
      const cellEntries = state.schedules.filter(
          s => s.dayOfWeek === dropData.day && s.periodId === dropData.periodId
      );
      if (cellEntries.length === 1) {
        dispatch({
          type: 'UPDATE_SCHEDULE_ENTRY',
          payload: { id: cellEntries[0].id, armId: arm.name, armName: arm.name },
        });
      }
    } else if (sourceData.type === 'PLACED_BLOCK') {
      dispatch({
        type: 'MOVE_SCHEDULE_ENTRY',
        id: sourceData.entry.id,
        day: dropData.day,
        periodId: dropData.periodId,
        periodNumber: dropData.periodNumber,
        startTime: dropData.startTime,
        endTime: dropData.endTime,
      });
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
          collisionDetection={pointerWithin}
      >
        <div className="flex h-full w-full overflow-hidden ">
          {showWizard ? (
              <PeriodSetupWizard onContinue={() => setOverrideShowGrid(true)} resources={resources} />
          ) : (
              <>
                <PalettePanel resources={resources} />
                <WeeklyGrid activeDragData={activeDragData} />
                <PropertiesPanel resources={resources} />
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