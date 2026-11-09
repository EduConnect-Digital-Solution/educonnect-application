import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Trash2, AlertTriangle, BookOpen, User } from 'lucide-react';
import { getSubjectColor } from '../TimetableContext';

/**
 * PeriodBlock
 * ───────────────────────────────
 * Represents a placed schedule entry inside a WeeklyGrid cell.
 * - Draggable: can be moved to another cell via DnD
 * - Conflict-aware: shows red ring on error, amber ring on warning
 * - Click: selects entry → PropertiesPanel activates
 */
export default function PeriodBlock({ entry, isSelected, isConflicted, isWarned, onSelect, onRemove, readOnly = false }) {
  const color = getSubjectColor(entry.subjectId);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `block_${entry.id}`,
    data: { type: 'PLACED_BLOCK', entry },
    disabled: readOnly,
  });

  const dragStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
    : undefined;

  // Ring color priority: error > warning > selected > none
  const ringClass = isConflicted
    ? 'ring-2 ring-red-500 ring-offset-1'
    : isWarned
    ? 'ring-2 ring-amber-400 ring-offset-1'
    : isSelected
    ? 'ring-2 ring-blue-500 ring-offset-1'
    : '';

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={[
        'group relative rounded-lg border p-1.5 cursor-grab active:cursor-grabbing select-none transition-all duration-150',
        color.bg, color.border, ringClass,
        isDragging ? 'opacity-40 scale-95' : 'hover:shadow-md',
      ].filter(Boolean).join(' ')}
      onClick={e => { e.stopPropagation(); onSelect(entry.id); }}
      {...(!readOnly ? { ...listeners, ...attributes } : {})}
    >
      {/* Conflict badge */}
      {(isConflicted || isWarned) && (
        <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold ${isConflicted ? 'bg-red-500' : 'bg-amber-400'}`}>
          !
        </span>
      )}

      {/* Subject name */}
      <div className="flex items-center gap-1 mb-0.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.dot}`} />
        <p className={`text-[11px] font-semibold leading-tight truncate ${color.text}`}>
          {entry.subjectName}
        </p>
      </div>

      {/* Teacher */}
      {entry.teacherName ? (
        <div className="flex items-center gap-1">
          <User size={9} className={color.text + ' opacity-60'} />
          <p className={`text-[10px] truncate leading-tight ${color.text} opacity-75`}>
            {entry.teacherName}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <AlertTriangle size={9} className="text-amber-500" />
          <p className="text-[10px] text-amber-600 leading-tight">No teacher</p>
        </div>
      )}

      {/* Arm String */}
      {entry.armName && (
        <div className="flex items-center gap-1 mt-0.5">
          <span className={`px-1 rounded-sm text-[8px] font-bold uppercase tracking-wider ${color.bg} ${color.text} opacity-80 border ${color.border}`}>
            {entry.armName}
          </span>
        </div>
      )}

      {/* Remove button — visible on hover, not when dragging */}
      {!readOnly && (
        <button
          onClick={e => { e.stopPropagation(); onRemove(entry.id); }}
          className="absolute top-0.5 right-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 text-red-500 transition-opacity"
          title="Remove"
        >
          <Trash2 size={10} />
        </button>
      )}
    </div>
  );
}
