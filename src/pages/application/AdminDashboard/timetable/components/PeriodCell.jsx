import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import PeriodBlock from './PeriodBlock';
import { useTimetable, makeScheduleEntry } from '../TimetableContext';

/**
 * PeriodCell
 * ───────────────────────────────
 * A single cell in the WeeklyGrid (represents one timeslot on one day).
 * Handles:
 * - Droppable target logic (via dnd-kit)
 * - Rendering placed `<PeriodBlock>` entries
 * - Rendering drop indicator and visual conflict warnings (cell level)
 * - Tap-to-place on touch screens: a tap places the chosen subject or moves the chosen lesson here;
 *   with a teacher chosen, tapping a lesson gives it that teacher (tapping again takes them off)
 */
export default function PeriodCell({ day, period, entries = [], isDropTarget }) {
  const { dispatch, selectedEntryId, conflictedIds, warnedIds, state, removeWithUndo } = useTimetable();
  const cellId = `${day}__${period.id}`; // e.g., Monday__p1

  const cell = { day, periodId: period.id, periodNumber: period.number, startTime: period.start, endTime: period.end };
  const { isOver, setNodeRef } = useDroppable({
    id: cellId,
    data: { type: 'CELL', ...cell },
    disabled: state.isPublished,
  });

  const tapMode = state.isPublished ? null : state.tapMode;
  const assigning = tapMode?.mode === 'assign';
  // Placing and moving target cells; assigning a teacher targets the lessons in them instead.
  const isTapTarget = tapMode && !assigning && !(tapMode.mode === 'move' && tapMode.entry.dayOfWeek === day && tapMode.entry.periodId === period.id);

  const assignTeacher = (entry) => {
    const { teacher } = tapMode;
    const already = entry.teacherId === teacher.id;
    dispatch({
      type: 'UPDATE_SCHEDULE_ENTRY',
      payload: { id: entry.id, teacherId: already ? null : teacher.id, teacherName: already ? null : teacher.name },
    });
  };

  const handleTap = () => {
    if (!isTapTarget) return;
    if (tapMode.mode === 'place') {
      const entry = makeScheduleEntry(state, tapMode.subject, cell);
      dispatch({ type: 'ADD_SCHEDULE_ENTRY', payload: entry });
      dispatch({ type: 'CLEAR_TAP_MODE' });
      dispatch({ type: 'SELECT_ENTRY', id: entry.id });
    } else {
      dispatch({ type: 'MOVE_SCHEDULE_ENTRY', id: tapMode.entry.id, ...cell });
      dispatch({ type: 'CLEAR_TAP_MODE' });
    }
  };

  // Cell level logic: if multiple entries are in this cell, the cell itself has an error
  const hasMultiple = entries.length > 1;

  const bgClass =
    isOver && !state.isPublished ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset'
    : isTapTarget ? 'bg-blue-50/40 ring-1 ring-blue-300 ring-dashed ring-inset cursor-pointer'
    : isDropTarget && !state.isPublished ? 'bg-blue-50/30 ring-1 ring-blue-200 ring-dashed ring-inset'
    : hasMultiple ? 'bg-red-50/50'
    : 'bg-white hover:bg-gray-50/50';

  return (
    <div
      ref={setNodeRef}
      onClick={isTapTarget ? handleTap : undefined}
      role={isTapTarget ? 'button' : undefined}
      aria-label={isTapTarget ? `${day} ${period.start}` : undefined}
      className={`min-h-[70px] h-full p-1 border-r border-b border-gray-100 transition-colors ${bgClass}`}
    >
      {/* Placed entries */}
      <div className="flex flex-col gap-1 h-full">
        {entries.map(entry => (
          <PeriodBlock
            key={entry.id}
            entry={entry}
            isSelected={selectedEntryId === entry.id}
            isConflicted={conflictedIds.has(entry.id)}
            isWarned={warnedIds.has(entry.id)}
            readOnly={state.isPublished}
            isAssignTarget={assigning}
            onSelect={(id) => (assigning ? assignTeacher(entry) : isTapTarget ? handleTap() : dispatch({ type: 'SELECT_ENTRY', id, openDetails: true }))}
            onRemove={removeWithUndo}
          />
        ))}

        {/* Empty state ghost */}
        {entries.length === 0 && !isOver && !state.isPublished && (
           <div className="w-full h-full min-h-[50px] border border-transparent rounded group-hover/grid:border-gray-100 border-dashed" />
        )}
      </div>
    </div>
  );
}
