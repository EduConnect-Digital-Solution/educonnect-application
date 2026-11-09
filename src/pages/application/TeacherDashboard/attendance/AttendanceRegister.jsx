import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Save,
  Send,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  Filter,
  CheckSquare,
  Square,
  Loader2,
  BookOpen,
  MapPin,
  CalendarDays,
  RefreshCw,
  LockKeyhole,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import StudentAttendanceRow from './StudentAttendanceRow';
import { saveDraftAttendance, submitAttendance, updateAttendance } from './attendanceAPIs';
import { useAuth } from '@/contexts/AuthContext';

// ─── Helpers ────────────────────
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatTime(time) {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

const FILTER_OPTIONS = [
  { value: 'all',      label: 'All Students' },
  { value: 'present',  label: 'Present' },
  { value: 'absent',   label: 'Absent' },
  { value: 'late',     label: 'Late' },
  { value: 'unmarked', label: 'Unmarked' },
];

// ─── Summary stats bar ──────────
function SummaryBar({ students }) {
  const stats = useMemo(() => {
    const total = students.length;
    const present = students.filter(s => s.status === 'present').length;
    const absent = students.filter(s => s.status === 'absent').length;
    const late = students.filter(s => s.status === 'late').length;
    const unmarked = students.filter(s => !s.status).length;
    const marked = total - unmarked;
    const pct = total > 0 ? Math.round((marked / total) * 100) : 0;
    return { total, present, absent, late, unmarked, marked, pct };
  }, [students]);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4">
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">
          {stats.marked} / {stats.total} marked
        </span>
        <span className={cn(
          'text-xs font-bold',
          stats.pct === 100 ? 'text-emerald-600' : 'text-blue-600',
        )}>
          {stats.pct}% complete
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            stats.pct === 100 ? 'bg-emerald-500' : 'bg-blue-500',
          )}
          style={{ width: `${stats.pct}%` }}
        />
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatPill
          value={stats.present}
          label="Present"
          color="emerald"
        />
        <StatPill
          value={stats.absent}
          label="Absent"
          color="red"
        />
        <StatPill
          value={stats.late}
          label="Late"
          color="amber"
        />
        <StatPill
          value={stats.unmarked}
          label="Unmarked"
          color={stats.unmarked > 0 ? 'orange' : 'gray'}
        />
      </div>
    </div>
  );
}

const COLOR_MAP = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  red:     'bg-red-50 text-red-600 border-red-200',
  amber:   'bg-amber-50 text-amber-700 border-amber-200',
  orange:  'bg-orange-50 text-orange-600 border-orange-200',
  gray:    'bg-gray-50 text-gray-500 border-gray-200',
};

function StatPill({ value, label, color }) {
  return (
    <div className={cn(
      'flex items-center justify-between px-3 py-2 rounded-lg border text-sm',
      COLOR_MAP[color],
    )}>
      <span className="font-semibold text-base">{value}</span>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

// ─── Inline notification banner ─
function Notification({ notification, onDismiss }) {
  if (!notification) return null;
  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error:   'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800',
  };
  return (
    <div className={cn(
      'flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium mb-4',
      styles[notification.type] || styles.info,
    )}>
      <span>{notification.message}</span>
      <button onClick={onDismiss} className="ml-3 opacity-60 hover:opacity-100 text-lg leading-none">&times;</button>
    </div>
  );
}

// ─── Bulk actions toolbar ───────
function BulkActionsToolbar({ selectedCount, onBulkStatus, onClearSelection }) {
  const [open, setOpen] = useState(false);
  if (selectedCount === 0) return null;
  return (
    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
      <span className="text-xs font-semibold text-blue-700">
        {selectedCount} selected
      </span>
      <span className="text-blue-200">|</span>
      <span className="text-xs text-blue-600 mr-1">Set as:</span>
      <button
        onClick={() => onBulkStatus('present')}
        className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-md transition-colors"
      >
        Present
      </button>
      <button
        onClick={() => onBulkStatus('absent')}
        className="px-2.5 py-1 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors"
      >
        Absent
      </button>
      <button
        onClick={() => onBulkStatus('late')}
        className="px-2.5 py-1 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-md transition-colors"
      >
        Late
      </button>
      <button
        onClick={onClearSelection}
        className="ml-1 text-xs text-blue-500 hover:text-blue-700 underline"
      >
        Clear
      </button>
    </div>
  );
}

// ─── Main AttendanceRegister ────
export default function AttendanceRegister({
  schedule,
  initialStudents,
  initialStatus,   // 'not_started' | 'in_progress' | 'completed'
  submittedAt,
  academicContext, // passed from page when available
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const isViewMode = searchParams.get('view') === 'true';
  const isEditMode = searchParams.get('edit') === 'true';
  const isReadOnly = isViewMode && !isEditMode;
  const isAlreadySubmitted = initialStatus === 'completed';

  // ─── State ──────────────────
  const [students, setStudents] = useState(initialStudents || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(isAlreadySubmitted);
  const [notification, setNotification] = useState(null);
  const [attendanceId, setAttendanceId] = useState(schedule?.attendanceId || null);
  const hasUnsavedRef = useRef(false);

  // ─── Track unsaved changes ──
  useEffect(() => {
    if (!isReadOnly && !isSubmitted) {
      const handler = (e) => {
        if (hasUnsavedRef.current) {
          e.preventDefault();
          e.returnValue = '';
        }
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [isReadOnly, isSubmitted]);

  // ─── Handlers ───────────────
  const markUnsaved = () => { hasUnsavedRef.current = true; };

  const handleStatusChange = useCallback((studentId, status) => {
    setStudents(prev => prev.map(s =>
      s.studentId === studentId ? { ...s, status } : s
    ));
    markUnsaved();
  }, []);

  const handleReasonChange = useCallback((studentId, reason) => {
    setStudents(prev => prev.map(s =>
      s.studentId === studentId ? { ...s, reason } : s
    ));
    markUnsaved();
  }, []);

  const handleLateTimeChange = useCallback((studentId, lateArrivalTime) => {
    setStudents(prev => prev.map(s =>
      s.studentId === studentId ? { ...s, lateArrivalTime } : s
    ));
    markUnsaved();
  }, []);

  const handleToggleSelect = useCallback((studentId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(studentId) ? next.delete(studentId) : next.add(studentId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const visibleIds = filteredStudents.map(s => s.studentId);
    const allSelected = visibleIds.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleIds.forEach(id => next.add(id));
        return next;
      });
    }
  }, [selectedIds]);

  const handleBulkStatus = useCallback((status) => {
    setStudents(prev => prev.map(s =>
      selectedIds.has(s.studentId) ? { ...s, status } : s
    ));
    setSelectedIds(new Set());
    markUnsaved();
  }, [selectedIds]);

  const handleMarkAllPresent = useCallback(() => {
    setStudents(prev => prev.map(s => ({ ...s, status: 'present', reason: '', lateArrivalTime: '' })));
    setSelectedIds(new Set());
    markUnsaved();
    setNotification({ type: 'info', message: 'All students marked as Present.' });
  }, []);

  // ─── Filtered view ──────────
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rollNumber.includes(searchQuery);
      const matchesFilter =
        filterStatus === 'all' ||
        (filterStatus === 'unmarked' ? !s.status : s.status === filterStatus);
      return matchesSearch && matchesFilter;
    });
  }, [students, searchQuery, filterStatus]);

  const allVisibleSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every(s => selectedIds.has(s.studentId));

  // ─── Build payload ──────────
  const buildPayload = (statusOverride) => ({
    // Academic context: prefer prop, fall back to schedule field, then empty stubs
    academicYearId: academicContext?.academicYearId ?? schedule?.academicContext?.academicYearId ?? '',
    academicYear:   academicContext?.academicYear   ?? schedule?.academicContext?.academicYear   ?? '',
    termId:         academicContext?.termId         ?? schedule?.academicContext?.termId         ?? '',
    term:           academicContext?.term           ?? schedule?.academicContext?.term           ?? '',
    scheduleId: schedule.scheduleId,
    classId: schedule.classId,
    subjectId: schedule.subjectId,
    periodId: schedule.periodId,
    teacherId: user?.id || 'tch_current',
    date: new Date().toISOString().split('T')[0],
    attendanceId,
    attendances: students.map(s => ({
      studentId: s.studentId,
      status: statusOverride || s.status,
      reason: s.reason || '',
      lateArrivalTime: s.lateArrivalTime || '',
    })),
  });

  // ─── Save draft ─────────────
  const handleSaveDraft = async () => {
    setIsSaving(true);
    setNotification(null);
    try {
      const payload = buildPayload();
      const res = await saveDraftAttendance(payload);
      if (res.success) {
        setAttendanceId(res.data.attendanceId);
        hasUnsavedRef.current = false;
        setNotification({ type: 'success', message: 'Draft saved successfully.' });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to save draft. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Submit ─────────────────
  const handleSubmit = async () => {
    const unmarked = students.filter(s => !s.status);
    if (unmarked.length > 0) {
      const proceed = window.confirm(
        `${unmarked.length} student${unmarked.length > 1 ? 's are' : ' is'} not yet marked.\n\n` +
        `Submit anyway? Unmarked students will be excluded from the record.`
      );
      if (!proceed) {
        setFilterStatus('unmarked');
        return;
      }
    }

    setIsSubmitting(true);
    setNotification(null);
    try {
      const payload = buildPayload();
      const res = (isAlreadySubmitted && isEditMode)
        ? await updateAttendance(attendanceId, payload)
        : await submitAttendance(payload);

      if (res.success) {
        setIsSubmitted(true);
        hasUnsavedRef.current = false;
        // Update the attendanceId in case backend assigned a new one
        if (res.data.attendanceId) setAttendanceId(res.data.attendanceId);
        const s = res.data.summary;
        const action = (isAlreadySubmitted && isEditMode) ? 'updated' : 'submitted';
        setNotification({
          type: 'success',
          message: `Attendance ${action} — ${s?.present ?? '—'} present, ${s?.absent ?? '—'} absent, ${s?.late ?? '—'} late.`,
        });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Submission failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Back navigation ────────
  const handleBack = () => {
    if (hasUnsavedRef.current && !isSubmitted) {
      const leave = window.confirm('You have unsaved changes. Leave without saving?');
      if (!leave) return;
    }
    navigate('/dashboard/teacher/attendance');
  };

  const today = formatDate(new Date().toISOString());

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Attendance
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {schedule.className} — {schedule.subjectName}
          </h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              {today}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Period {schedule.periodNumber} · {formatTime(schedule.timeSlot?.start)} – {formatTime(schedule.timeSlot?.end)}
            </span>
            {schedule.room && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {schedule.room}
              </span>
            )}
          </div>
        </div>

        {/* Status badge */}
        <div className="flex-shrink-0">
          {isSubmitted ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700
              border border-emerald-200 rounded-full text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {submittedAt ? `Submitted ${new Date(submittedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : 'Submitted'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700
              border border-amber-200 rounded-full text-xs font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              In Progress
            </span>
          )}
        </div>
      </div>

      {/* ── Notification ──── */}
      <Notification notification={notification} onDismiss={() => setNotification(null)} />

      {/* ── Summary stats ─── */}
      <SummaryBar students={students} />

      {/* ── Toolbar ───────── */}
      {!isReadOnly && (
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name or roll number…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg
                bg-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            />
          </div>

          {/* Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg
                bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 cursor-pointer"
            >
              {FILTER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Mark All Present */}
          {!isSubmitted && (
            <button
              onClick={handleMarkAllPresent}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium
                text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200
                rounded-lg transition-colors whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark All Present
            </button>
          )}
        </div>
      )}

      {/* Search for read-only mode */}
      {isReadOnly && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search students…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg
              bg-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      )}

      {/* ── Bulk actions ───── */}
      {!isReadOnly && !isSubmitted && (
        <div className="mb-3">
          <BulkActionsToolbar
            selectedCount={selectedIds.size}
            onBulkStatus={handleBulkStatus}
            onClearSelection={() => setSelectedIds(new Set())}
          />
        </div>
      )}

      {/* ── Student list ───── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex-1">
        {/* Column headers */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {!isReadOnly && !isSubmitted && (
            <button
              onClick={handleSelectAll}
              className="w-4 h-4 flex items-center justify-center flex-shrink-0"
              title={allVisibleSelected ? 'Deselect all' : 'Select all'}
            >
              {allVisibleSelected
                ? <CheckSquare className="w-4 h-4 text-blue-600" />
                : <Square className="w-4 h-4 text-gray-400" />
              }
            </button>
          )}
          <span className="w-8 text-right flex-shrink-0">#</span>
          <span className="flex-1">Student Name</span>
          <span className="flex-shrink-0 pr-1">Status</span>
        </div>

        {/* Student rows */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 22rem)' }}>
          {filteredStudents.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              {searchQuery || filterStatus !== 'all'
                ? 'No students match your filter.'
                : 'No students in this class.'}
            </div>
          ) : (
            filteredStudents.map(student => (
              <StudentAttendanceRow
                key={student.studentId}
                student={student}
                isSelected={selectedIds.has(student.studentId)}
                isReadOnly={isReadOnly || isSubmitted}
                onStatusChange={handleStatusChange}
                onReasonChange={handleReasonChange}
                onLateTimeChange={handleLateTimeChange}
                onToggleSelect={handleToggleSelect}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Footer actions ─── */}
      {!isReadOnly && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-100">
          {/* Left: student count */}
          <span className="text-xs text-gray-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {students.filter(s => s.status).length} of {students.length} marked
          </span>

          {/* Right: actions */}
          <div className="flex items-center gap-3">
            {!isSubmitted && (
              <button
                onClick={handleSaveDraft}
                disabled={isSaving || isSubmitting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium
                  text-gray-700 bg-white hover:bg-gray-50 border border-gray-200
                  rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Save className="w-4 h-4" />
                }
                {isSaving ? 'Saving…' : 'Save Draft'}
              </button>
            )}

            {isSubmitted && isEditMode ? (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold
                  text-white bg-blue-600 hover:bg-blue-700
                  rounded-lg transition-colors disabled:opacity-60 shadow-sm"
              >
                {isSubmitting
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <RefreshCw className="w-4 h-4" />
                }
                {isSubmitting ? 'Updating…' : 'Update Attendance'}
              </button>
            ) : !isSubmitted ? (
              <button
                onClick={handleSubmit}
                disabled={isSaving || isSubmitting}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold
                  text-white bg-blue-600 hover:bg-blue-700
                  rounded-lg transition-colors disabled:opacity-60 shadow-sm"
              >
                {isSubmitting
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />
                }
                {isSubmitting ? 'Submitting…' : 'Submit Attendance'}
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <LockKeyhole className="w-3.5 h-3.5" />
                Attendance submitted and locked
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
