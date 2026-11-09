import React from 'react';
import { DAYS } from '../TimetableContext';
import PeriodCell from './PeriodCell';
import { useTimetable } from '../TimetableContext';

/**
 * WeeklyGrid
 * ───────────────────────────────
 * The main canvas of the builder. Renders the time matrix (Periods × Days).
 * Maps local `schedules` state to correct cells.
 */
export default function WeeklyGrid({ activeDragData }) {
  const { state, scheduleByCell } = useTimetable();

  // If no class is selected, show empty placeholder
  if (!state.selectedClass) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900">No class selected</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-sm text-center">Select an academic year, term, and class from the top bar to start building their timetable.</p>
      </div>
    );
  }

  // Active drag validation to highlight valid drop zones
  const isDraggingPaletteSubject = activeDragData?.type === 'SUBJECT';
  const isDraggingPlacedBlock = activeDragData?.type === 'PLACED_BLOCK';

  return (
    <div className="flex-1 bg-white flex flex-col overflow-hidden relative group/grid">
      
      {/* Grid Header (Days) */}
      <div className="grid grid-cols-[80px_repeat(5,1fr)] border-b border-gray-200 bg-gray-50 shrink-0 sticky top-0 z-10">
        <div className="p-3 border-r border-gray-200 flex items-end justify-end">
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Time</span>
        </div>
        {DAYS.map(day => (
          <div key={day} className="p-3 border-r border-gray-200 text-sm font-bold text-gray-700 text-center">
            {day}
          </div>
        ))}
      </div>

      {/* Grid Body (Periods) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {state.periods.map(period => (
          <div key={period.id} className="grid grid-cols-[80px_repeat(5,1fr)] min-h-[70px]">
            
            {/* Context/Time Label axis */}
            <div className="p-2 border-r border-b border-gray-100 bg-gray-50/50 flex flex-col justify-center items-center shrink-0">
              {period.isBreak ? (
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded">{period.label}</span>
              ) : (
                <>
                  <span className="text-xs font-bold text-gray-800">{period.label}</span>
                  <span className="text-[10px] text-gray-500 font-medium mt-0.5 whitespace-nowrap">{period.start} - {period.end}</span>
                </>
              )}
            </div>

            {/* Matrix Cells */}
            {period.isBreak ? (
              // Break row (spans across)
              <div className="col-span-5 border-b border-gray-100 bg-gray-50/30 flex items-center justify-center flex-col">
                <div className="w-full max-w-sm h-px bg-gray-200" />
              </div>
            ) : (
              // Standard period cells
              DAYS.map(day => {
                const cellId = `${day}__${period.id}`;
                const entriesForCell = scheduleByCell[cellId] || [];
                return (
                  <PeriodCell
                    key={cellId}
                    day={day}
                    period={period}
                    entries={entriesForCell}
                    // Visual cue if we are holding a valid droppable
                    isDropTarget={isDraggingPaletteSubject || isDraggingPlacedBlock}
                  />
                );
              })
            )}

          </div>
        ))}
        {/* Bottom padding for scroll */}
        <div className="h-16" />
      </div>
    </div>
  );
}
