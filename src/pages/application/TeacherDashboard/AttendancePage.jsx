import React, { useState, useEffect } from 'react';
import TeacherLayout from './components/layout/TeacherLayout.jsx';
import TodaysClassesBoard from './attendance/TodaysClassesBoard.jsx';
import { getScheduledClasses } from './attendance/attendanceAPIs.js';
import { CalendarDays, RefreshCw } from 'lucide-react';


function formatHeaderDate(date = new Date()) {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function AttendancePage() {
  const [scheduledClasses, setScheduledClasses] = useState([]);
  const [academicContext, setAcademicContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getScheduledClasses();
      setScheduledClasses(res.data.scheduledClasses);
      setAcademicContext(res.data.academicContext ?? null);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load schedule:', err);
      setError('Unable to load your timetable. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);


  return (
    <TeacherLayout>
      <div className="w-full mx-auto">

        {/* ── Page header ─ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
            <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
              <CalendarDays className="w-4 h-4" />
              {formatHeaderDate()}
            </p>
          </div>
          <button
            onClick={fetchClasses}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium
              text-gray-600 bg-white hover:bg-gray-50 border border-gray-200
              rounded-lg transition-colors disabled:opacity-50 self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* ── Error state ── */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-5">
            <span className="flex-1">{error}</span>
            <button
              onClick={fetchClasses}
              className="font-semibold underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Board ──────── */}
        <TodaysClassesBoard
          classes={scheduledClasses}
          loading={loading}
          academicContext={academicContext}
        />

        {/* ── Last refreshed ──────── */}
        {lastRefreshed && !loading && (
          <p className="text-xs text-gray-400 text-right mt-3">
            Last updated {lastRefreshed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </TeacherLayout>
  );
}
