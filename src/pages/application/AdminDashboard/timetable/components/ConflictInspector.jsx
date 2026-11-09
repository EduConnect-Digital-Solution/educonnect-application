import React from 'react';
import { AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react';

/**
 * ConflictInspector
 * ───────────────────────────────
 * Rendered inside the PropertiesPanel's right sidebar.
 * Lists all active conflicts with severity, message, and a "Jump to" action.
 */
export default function ConflictInspector({ conflicts, onJumpTo }) {
  if (conflicts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
          <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-gray-600">No conflicts</p>
        <p className="text-xs text-gray-400 text-center">Your schedule is clean and ready to publish.</p>
      </div>
    );
  }

  const errors = conflicts.filter(c => c.severity === 'error');
  const warnings = conflicts.filter(c => c.severity === 'warning');

  return (
    <div className="space-y-2">
      {/* Summary bar */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
        {errors.length > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-red-600">
            <AlertCircle size={12} />
            {errors.length} error{errors.length > 1 ? 's' : ''}
          </span>
        )}
        {errors.length > 0 && warnings.length > 0 && (
          <span className="text-gray-300">|</span>
        )}
        {warnings.length > 0 && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600">
            <AlertTriangle size={12} />
            {warnings.length} warning{warnings.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Error list */}
      {errors.map(conflict => (
        <ConflictItem key={conflict.id} conflict={conflict} onJumpTo={onJumpTo} />
      ))}

      {/* Warning list */}
      {warnings.map(conflict => (
        <ConflictItem key={conflict.id} conflict={conflict} onJumpTo={onJumpTo} />
      ))}
    </div>
  );
}

function ConflictItem({ conflict, onJumpTo }) {
  const isError = conflict.severity === 'error';

  const styles = isError
    ? { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" /> }
    : { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" /> };

  return (
    <div className={`p-2.5 rounded-lg border ${styles.bg} ${styles.border}`}>
      <div className="flex gap-2">
        {styles.icon}
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-semibold ${styles.text} leading-tight`}>
            {conflictTypeLabel(conflict.type)}
          </p>
          <p className={`text-[10px] mt-0.5 ${styles.text} opacity-80 leading-snug`}>
            {conflict.message}
          </p>
        </div>
      </div>
      {onJumpTo && conflict.affectedEntryIds?.length > 0 && (
        <button
          onClick={() => onJumpTo(conflict.affectedEntryIds[0])}
          className={`mt-1.5 w-full text-[10px] font-bold ${styles.text} flex items-center justify-end gap-0.5 opacity-70 hover:opacity-100 transition-opacity`}
        >
          Jump to slot <ChevronRight size={10} />
        </button>
      )}
    </div>
  );
}

function conflictTypeLabel(type) {
  const labels = {
    TEACHER_DOUBLE_BOOKING: 'Teacher Double-Booking',
    ROOM_CONFLICT: 'Room Conflict',
    PERIOD_DUPLICATION: 'Period Duplication',
    SUBJECT_OVERLOAD: 'Subject Overload',
    MISSING_TEACHER: 'Unassigned Teacher',
  };
  return labels[type] ?? type;
}
