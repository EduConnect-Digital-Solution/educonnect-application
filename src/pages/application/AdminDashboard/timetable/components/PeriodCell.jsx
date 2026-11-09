import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import PeriodBlock from './PeriodBlock';
import { useTimetable } from '../TimetableContext';

/**
 * PeriodCell
 * ───────────────────────────────
 * A single cell in the WeeklyGrid (represents one timeslot on one day).
 * Handles:
 * - Droppable target logic (via dnd-kit)
 * - Rendering placed `<PeriodBlock>` entries
 * - Rendering drop indicator and visual conflict warnings (cell level)
 */
export default function PeriodCell({ day, period, entries = [], isDropTarget }) {
  const { dispatch, selectedEntryId, conflictedIds, warnedIds, state } = useTimetable();
  const cellId = `${day}__${period.id}`; // e.g., Monday__p1

  const { isOver, setNodeRef } = useDroppable({
    id: cellId,
    data: { type: 'CELL', day, periodId: period.id, periodNumber: period.number, startTime: period.start, endTime: period.end },
    disabled: state.isPublished,
  });

  // Cell level logic: if multiple entries are in this cell, the cell itself has an error
  const hasMultiple = entries.length > 1;

  const bgClass =
    isOver && !state.isPublished ? 'bg-blue-50 ring-2 ring-blue-500 ring-inset'
    : isDropTarget && !state.isPublished ? 'bg-blue-50/30 ring-1 ring-blue-200 ring-dashed ring-inset'
    : hasMultiple ? 'bg-red-50/50'
    : 'bg-white hover:bg-gray-50/50';

  return (
    <div
      ref={setNodeRef}
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
            onSelect={(id) => dispatch({ type: 'SELECT_ENTRY', id })}
            onRemove={(id) => dispatch({ type: 'REMOVE_SCHEDULE_ENTRY', id })}
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
