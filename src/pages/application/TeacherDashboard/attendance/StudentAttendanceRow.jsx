import React, { memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Status button group (P / A / L) ────
const STATUS_OPTIONS = [
  { value: 'present', label: 'P', title: 'Present', activeClass: 'bg-emerald-500 text-white border-emerald-500' },
  { value: 'absent',  label: 'A', title: 'Absent',  activeClass: 'bg-red-500 text-white border-red-500' },
  { value: 'late',    label: 'L', title: 'Late',    activeClass: 'bg-amber-500 text-white border-amber-500' },
];

const ROW_BG = {
  present: 'bg-emerald-50/40',
  absent:  'bg-red-50/40',
  late:    'bg-amber-50/30',
  null:    '',
};

const StudentAttendanceRow = memo(function StudentAttendanceRow({
  student,
  isSelected,
  isReadOnly,
  onStatusChange,
  onReasonChange,
  onLateTimeChange,
  onToggleSelect,
}) {
  const { studentId, rollNumber, fullName, status, reason, lateArrivalTime } = student;
  const isUnmarked = status === null || status === undefined;

  return (
    <div className={cn(
      'group flex flex-col gap-2 px-4 py-3 border-b border-gray-100 last:border-0 transition-colors duration-100',
      ROW_BG[status] || '',
      isSelected && 'ring-inset ring-1 ring-blue-300',
    )}>
      <div className="flex items-center gap-3">
        {/* Checkbox */}
        {!isReadOnly && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(studentId)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer flex-shrink-0 accent-blue-600"
          />
        )}

        {/* Roll number */}
        <span className="w-8 text-xs font-mono text-gray-400 flex-shrink-0 text-right">
          {rollNumber}
        </span>

        {/* Name */}
        <span className={cn(
          'flex-1 text-sm font-medium min-w-0 truncate',
          isUnmarked ? 'text-gray-700' : 'text-gray-900',
        )}>
          {fullName}
        </span>

        {/* Unmarked indicator */}
        {isUnmarked && !isReadOnly && (
          <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" title="Not yet marked" />
        )}

        {/* Status toggle buttons */}
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => !isReadOnly && onStatusChange(studentId, opt.value)}
              disabled={isReadOnly}
              title={opt.title}
              className={cn(
                'px-3 py-1.5 text-xs font-bold transition-colors duration-100',
                'border-r border-gray-200 last:border-0',
                status === opt.value
                  ? opt.activeClass
                  : 'bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-600',
                isReadOnly && 'cursor-default',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conditional: Absent reason */}
      {status === 'absent' && (
        <div className="flex items-start gap-3 pl-7 sm:pl-14">
          <label className="text-xs text-gray-500 font-medium w-16 pt-1.5 flex-shrink-0">
            Reason
          </label>
          <input
            type="text"
            value={reason}
            onChange={e => !isReadOnly && onReasonChange(studentId, e.target.value)}
            readOnly={isReadOnly}
            placeholder="Optional — e.g. Sick, Family emergency"
            className={cn(
              'flex-1 text-sm px-3 py-1.5 border border-red-200 rounded-lg',
              'bg-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300',
              isReadOnly && 'bg-gray-50 text-gray-600 cursor-default',
            )}
          />
        </div>
      )}

      {/* Conditional: Late time + reason */}
      {status === 'late' && (
        <div className="flex flex-col sm:flex-row gap-2 pl-7 sm:pl-14">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium w-16 flex-shrink-0">
              Arrived
            </label>
            <input
              type="time"
              value={lateArrivalTime}
              onChange={e => !isReadOnly && onLateTimeChange(studentId, e.target.value)}
              readOnly={isReadOnly}
              className={cn(
                'text-sm px-3 py-1.5 border border-amber-200 rounded-lg',
                'bg-white focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300',
                isReadOnly && 'bg-gray-50 text-gray-600 cursor-default',
              )}
            />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <label className="text-xs text-gray-500 font-medium w-16 sm:w-auto flex-shrink-0">
              Reason
            </label>
            <input
              type="text"
              value={reason}
              onChange={e => !isReadOnly && onReasonChange(studentId, e.target.value)}
              readOnly={isReadOnly}
              placeholder="Optional — e.g. Bus delay"
              className={cn(
                'flex-1 text-sm px-3 py-1.5 border border-amber-200 rounded-lg',
                'bg-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300',
                isReadOnly && 'bg-gray-50 text-gray-600 cursor-default',
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
});

export default StudentAttendanceRow;
