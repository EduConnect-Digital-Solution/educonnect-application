import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import TeacherLayout from './components/layout/TeacherLayout.jsx';
import AttendanceRegister from './attendance/AttendanceRegister.jsx';
import { getSessionStudents, getScheduledClasses } from './attendance/attendanceAPIs.js';

export default function AttendanceRegisterPage() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schedule, setSchedule] = useState(location.state?.schedule ?? null);
  const [academicContext, setAcademicContext] = useState(location.state?.academicContext ?? null);
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    if (!scheduleId) {
      navigate('/dashboard/teacher/attendance');
      return;
    }

    const fetchSession = async () => {
      try {
        setLoading(true);

        // If we arrived via a direct URL (refresh / deep link) we won't have the
        // schedule object in router state — re-fetch the full list and find it.
        let resolvedSchedule = schedule;
        if (!resolvedSchedule) {
          const listRes = await getScheduledClasses();
          resolvedSchedule = listRes.data.scheduledClasses.find(s => s.scheduleId === scheduleId);
          if (!resolvedSchedule) throw new Error('Schedule not found for id: ' + scheduleId);
          setSchedule(resolvedSchedule);
          // Also capture academic context from the refetched response
          setAcademicContext(listRes.data.academicContext ?? null);
        }

        // Pass the full schedule object so getSessionStudents can use
        // className + subjectName to call the real API.
        const res = await getSessionStudents(resolvedSchedule);
        setSessionData(res.data);
      } catch (err) {
        console.error('Failed to load session:', err);
        setError('Unable to load this attendance session.');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleId]);

  // ── Loading ───────────────
  if (loading) {
    return (
      <TeacherLayout>
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin" />
          </div>
          <p className="mt-4 text-gray-500 font-medium animate-pulse">Loading attendance register…</p>
        </div>
      </TeacherLayout>
    );
  }

  // ── Error / not found ─────
  if (error || !schedule || !sessionData) {
    return (
      <TeacherLayout>
        <div className="flex flex-col items-center justify-center h-screen">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-md">
            <p className="text-red-700 font-semibold mb-2">
              {error || 'This schedule could not be found.'}
            </p>
            <button
              onClick={() => navigate('/dashboard/teacher/attendance')}
              className="mt-4 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              Back to Attendance
            </button>
          </div>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="w-full max-w-5xl mx-auto">
        <AttendanceRegister
          schedule={schedule}
          initialStudents={sessionData.students}
          initialStatus={sessionData.attendanceStatus}
          submittedAt={sessionData.submittedAt}
          academicContext={academicContext}
        />
      </div>
    </TeacherLayout>
  );
}
