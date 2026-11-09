import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  Circle,
  Loader2,
  ChevronRight,
  Pencil,
  Eye,
  ClipboardList,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Status configuration ───────
const STATUS_CONFIG = {
  completed: {
    label: 'Completed',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
  },
  in_progress: {
    label: 'In Progress',
    dot: 'bg-amber-400 animate-pulse',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Loader2,
    iconColor: 'text-amber-500',
  },
  not_started: {
    label: 'Not Started',
    dot: 'bg-gray-300',
    badge: 'bg-gray-50 text-gray-500 border-gray-200',
    icon: Circle,
    iconColor: 'text-gray-400',
  },
};

function formatTime(time) {
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

// ─── Summary bar at the top ─────
function BoardSummary({ classes }) {
  const stats = useMemo(() => {
    return {
      total: classes.length,
      completed: classes.filter(c => c.attendanceStatus === 'completed').length,
      inProgress: classes.filter(c => c.attendanceStatus === 'in_progress').length,
      notStarted: classes.filter(c => c.attendanceStatus === 'not_started').length,
    };
  }, [classes]);

  const pct = Math.round((stats.completed / (stats.total || 1)) * 100);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
      <div>
        <h2 className="text-lg font-bold text-gray-800">Today's Classes</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {stats.completed} of {stats.total} attendance records submitted
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          {stats.completed} Done
        </div>
        <div className="flex items-center gap-1.5 text-sm text-amber-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          {stats.inProgress} In Progress
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
          {stats.notStarted} Pending
        </div>
      </div>
    </div>
  );
}

// ─── Completion mini-bar inside a row ───
function MiniProgressBar({ total, present, absent, late }) {
  const marked = present + absent + late;
  const pct = total > 0 ? Math.round((marked / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 tabular-nums w-8 text-right">{pct}%</span>
    </div>
  );
}

// ─── A single scheduled class row ───────
function ClassRow({ schedule, onMark, onView, onEdit }) {
  const cfg = STATUS_CONFIG[schedule.attendanceStatus];
  const StatusIcon = cfg.icon;
  const isCompleted = schedule.attendanceStatus === 'completed';
  const isInProgress = schedule.attendanceStatus === 'in_progress';
  const isNotStarted = schedule.attendanceStatus === 'not_started';

  return (
    <div className={cn(
      'group flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4',
      'border-b border-gray-100 last:border-0',
      'hover:bg-gray-50/70 transition-colors duration-100',
    )}>
      {/* Period badge */}
      <div className="flex-shrink-0 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-sm">
          P{schedule.periodNumber}
        </div>
      </div>

      {/* Class + Subject */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 text-sm">{schedule.className}</span>
          <span className="text-gray-300">·</span>
          <span className="flex items-center gap-1 text-sm text-gray-600">
            <BookOpen className="w-3.5 h-3.5" />
            {schedule.subjectName}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            {formatTime(schedule.timeSlot.start)} – {formatTime(schedule.timeSlot.end)}
          </span>
          {schedule.room && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <MapPin className="w-3 h-3" />
              {schedule.room}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Users className="w-3 h-3" />
            {schedule.studentCount} students
          </span>
        </div>

        {/* Completion bar for in-progress / completed */}
        {!isNotStarted && (
          <MiniProgressBar
            total={schedule.studentCount}
            present={schedule.presentCount}
            absent={schedule.absentCount}
            late={schedule.lateCount}
          />
        )}
      </div>

      {/* Attendance mini-stats (completed/in-progress) */}
      {!isNotStarted && (
        <div className="hidden lg:flex items-center gap-3 text-xs flex-shrink-0">
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {schedule.presentCount} Present
          </span>
          <span className="flex items-center gap-1 text-red-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            {schedule.absentCount} Absent
          </span>
          <span className="flex items-center gap-1 text-amber-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            {schedule.lateCount} Late
          </span>
        </div>
      )}

      {/* Status badge */}
      <div className="flex-shrink-0">
        <span className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
          cfg.badge,
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
          {cfg.label}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isNotStarted && (
          <button
            onClick={() => onMark(schedule)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
              text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Mark Attendance
          </button>
        )}
        {isInProgress && (
          <button
            onClick={() => onMark(schedule)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
              text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Continue
          </button>
        )}
        {isCompleted && (
          <button
            onClick={() => onEdit(schedule)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
              text-gray-600 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
        <button
          onClick={() => onView(schedule)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium
            text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="View Register"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Empty state ────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
        <ClipboardList className="w-7 h-7 text-gray-400" />
      </div>
      <p className="text-gray-700 font-medium">No classes scheduled for today</p>
      <p className="text-gray-400 text-sm mt-1">
        Your timetable for today is empty. Enjoy your free period!
      </p>
    </div>
  );
}

// ─── Main Board ─────────────────
export default function TodaysClassesBoard({ classes = [], loading = false, academicContext = null }) {
  const navigate = useNavigate();

  const handleMark = (schedule) => {
    navigate(`/dashboard/teacher/attendance/register/${schedule.scheduleId}`, { state: { schedule, academicContext } });
  };

  const handleView = (schedule) => {
    navigate(`/dashboard/teacher/attendance/register/${schedule.scheduleId}?view=true`, { state: { schedule, academicContext } });
  };

  const handleEdit = (schedule) => {
    navigate(`/dashboard/teacher/attendance/register/${schedule.scheduleId}?edit=true`, { state: { schedule, academicContext } });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-gray-100 rounded w-48" />
          <div className="h-3 bg-gray-100 rounded w-64 mt-1" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-t border-gray-50">
              <div className="w-9 h-9 rounded-xl bg-gray-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-gray-100 rounded w-40" />
                <div className="h-2.5 bg-gray-100 rounded w-56" />
              </div>
              <div className="h-6 bg-gray-100 rounded-full w-24" />
              <div className="h-7 bg-gray-100 rounded-lg w-28" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 pt-5">
        <BoardSummary classes={classes} />
      </div>

      {classes.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="divide-y divide-gray-50">
          {classes.map(schedule => (
            <ClassRow
              key={schedule.scheduleId}
              schedule={schedule}
              onMark={handleMark}
              onView={handleView}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
