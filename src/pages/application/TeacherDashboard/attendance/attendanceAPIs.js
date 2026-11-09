/**
 * Attendance API Functions — Frontend Contract
 * ─────────────────────────────────────────────
 * All functions make real HTTP calls via apiClient (axios).
 *
 * READ routes (already-live teacher endpoints):
 *   getScheduledClasses   → GET  /api/teacher/attendance/schedule?date=YYYY-MM-DD
 *   getSessionStudents    → GET  /api/teacher/attendance/sessions/:scheduleId/students
 *   getAttendanceHistory  → GET  /api/teacher/attendance/history?page=&limit=&classId=&subjectId=
 *   getAttendanceByDate   → GET  /api/teacher/attendance/date/:date
 *   getAttendanceSummary  → GET  /api/teacher/attendance/summary/:scheduleId
 *
 * WRITE routes (pending backend implementation):
 *   saveDraftAttendance   → POST /api/teacher/attendance/draft
 *   submitAttendance      → POST /api/teacher/attendance/submit
 *   updateAttendance      → PUT  /api/teacher/attendance/:attendanceId
 *
 * When ATTENDANCE_BACKEND_LIVE === false the write functions fall back to
 * local mocks so the UI stays functional during development.
 *
 * Flip ATTENDANCE_BACKEND_LIVE to `true` once the backend is deployed.
 */

import apiClient from '../../../../utils/axiosConfig';
import {
  getTeacherClasses,
  getSubjectsByClass,
  getStudentsByClassandSubject,
  getTeacherDashboard,
} from '../../../auth/authAPIs.js';

// ─── Feature flag ──────────────────────────────────────────────────────────
// Set to `true` once ALL attendance backend endpoints are live.
export const ATTENDANCE_BACKEND_LIVE = true;

// ─── Period time slots (used in fallback mode only) ─────────────────────────
const PERIOD_SLOTS = [
  { periodNumber: 1, start: '08:00', end: '08:45' },
  { periodNumber: 2, start: '09:00', end: '09:45' },
  { periodNumber: 3, start: '10:00', end: '10:45' },
  { periodNumber: 4, start: '11:00', end: '11:45' },
  { periodNumber: 5, start: '13:00', end: '13:45' },
  { periodNumber: 6, start: '14:00', end: '14:45' },
  { periodNumber: 7, start: '15:00', end: '15:45' },
  { periodNumber: 8, start: '16:00', end: '16:45' },
];

// ─── Stable ID helpers (used in fallback mode) ──────────────────────────────
function classId(className)    { return `cls_${String(className).replace(/\s+/g, '_').toLowerCase()}`; }
function subjectId(subjectName){ return `sub_${String(subjectName).replace(/\s+/g, '_').toLowerCase()}`; }
function scheduleId(className, subjectName, periodNumber) {
  return `sch_${classId(className)}_${subjectId(subjectName)}_p${periodNumber}`;
}

// ─── Delay helper (fallback mock only) ──────────────────────────────────────
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ───────────────────────────────────────────────────────────────────────────
// 1.  GET /api/teacher/attendance/schedule?date=YYYY-MM-DD
//
//     Returns the teacher's scheduled classes for a given date, enriched with
//     per-session attendance status (not_started / in_progress / completed).
//
//     Query params:
//       date  (required) — ISO date string YYYY-MM-DD. Defaults to today.
//
//     Expected response:
//     {
//       "success": true,
//       "data": {
//         "date": "YYYY-MM-DD",
//         "academicContext": {
//           "academicYearId": "string",
//           "academicYear": "string",
//           "termId": "string",
//           "term": "string"
//         },
//         "scheduledClasses": [
//           {
//             "scheduleId": "string",
//             "classId": "string",
//             "className": "string",
//             "subjectId": "string",
//             "subjectName": "string",
//             "periodId": "string",
//             "periodNumber": 1,
//             "timeSlot": { "start": "HH:mm", "end": "HH:mm" },
//             "room": "string | null",
//             "attendanceStatus": "not_started | in_progress | completed",
//             "attendanceId": "string | null",
//             "studentCount": 30,
//             "presentCount": 0,
//             "absentCount": 0,
//             "lateCount": 0
//           }
//         ]
//       }
//     }
// ───────────────────────────────────────────────────────────────────────────
export async function getScheduledClasses(date = new Date().toISOString().split('T')[0]) {
  if (ATTENDANCE_BACKEND_LIVE) {
    const { data } = await apiClient.get('/api/teacher/attendance/schedule', { params: { date } });
    return data;
  }

  // ── Fallback: assemble schedule from existing teacher endpoints ────────────
  const [classRes, dashboardRes] = await Promise.all([
    getTeacherClasses(),
    getTeacherDashboard(),
  ]);

  const classes = classRes?.data?.classes ?? [];
  const teacher = dashboardRes?.data?.teacher ?? {};

  const academicContext = {
    academicYearId: teacher.academicYearId ?? 'ay_current',
    academicYear:   teacher.academicYear   ?? 'Current Year',
    termId:         teacher.termId         ?? 'term_current',
    term:           teacher.currentTerm    ?? teacher.term ?? 'Current Term',
  };

  const subjectResults = await Promise.allSettled(
    classes.map((cls) =>
      getSubjectsByClass(cls.name).then((r) => ({ cls, subjects: r?.data?.subjects ?? [] }))
    )
  );

  let periodCounter = 0;
  const scheduledClasses = [];

  for (const result of subjectResults) {
    if (result.status !== 'fulfilled') continue;
    const { cls, subjects } = result.value;

    for (const subject of subjects) {
      const slot = PERIOD_SLOTS[periodCounter % PERIOD_SLOTS.length];
      periodCounter++;

      scheduledClasses.push({
        scheduleId:       scheduleId(cls.name, subject.name, slot.periodNumber),
        classId:          cls.id || cls._id || classId(cls.name),
        className:        cls.name,
        subjectId:        subject.id || subject._id || subjectId(subject.name),
        subjectName:      subject.name,
        periodId:         `per_${String(slot.periodNumber).padStart(3, '0')}`,
        periodNumber:     slot.periodNumber,
        timeSlot:         { start: slot.start, end: slot.end },
        room:             null,
        attendanceStatus: 'not_started',
        attendanceId:     null,
        studentCount:     subject.studentCount ?? cls.studentCount ?? 0,
        presentCount:     0,
        absentCount:      0,
        lateCount:        0,
      });
    }
  }

  return {
    success: true,
    data: {
      date,
      academicContext,
      scheduledClasses,
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// 2.  GET /api/teacher/attendance/sessions/:scheduleId/students
//
//     Returns the student roster for a scheduled session, including any
//     previously saved attendance status for each student.
//
//     Path params:
//       scheduleId — unique schedule identifier
//
//     Query params (optional — helps backend resolve class+subject):
//       className, subjectName
//
//     Expected response:
//     {
//       "success": true,
//       "data": {
//         "scheduleId": "string",
//         "attendanceId": "string | null",
//         "attendanceStatus": "not_started | in_progress | completed",
//         "submittedAt": "ISO8601 | null",
//         "students": [
//           {
//             "studentId": "string",
//             "rollNumber": "string",
//             "fullName": "string",
//             "status": "present | absent | late | null",
//             "reason": "string",
//             "lateArrivalTime": "HH:mm | empty string"
//           }
//         ]
//       }
//     }
// ───────────────────────────────────────────────────────────────────────────
export async function getSessionStudents(scheduleEntry) {
  const { className, subjectName, scheduleId: sid } = scheduleEntry;

  if (!className || !subjectName) {
    throw new Error('getSessionStudents requires className and subjectName on the schedule entry.');
  }

  if (ATTENDANCE_BACKEND_LIVE) {
    const { data } = await apiClient.get(
      `/api/teacher/attendance/sessions/${sid}/students`,
      { params: { className, subjectName } }
    );
    return data;
  }

  // ── Fallback: fetch real students from existing endpoint ──────────────────
  const res = await getStudentsByClassandSubject(className, subjectName);
  const rawStudents = res?.data?.students ?? [];

  const students = rawStudents.map((s, i) => ({
    studentId:       s.id || s._id || s.studentId,
    rollNumber:      s.rollNumber || s.studentId || String(i + 1).padStart(3, '0'),
    fullName:        s.fullName,
    status:          null,
    reason:          '',
    lateArrivalTime: '',
  }));

  return {
    success: true,
    data: {
      scheduleId:       sid,
      attendanceId:     null,
      attendanceStatus: 'not_started',
      submittedAt:      null,
      students,
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// 3.  POST /api/teacher/attendance/draft
//
//     Saves an in-progress attendance session as a draft. The record can be
//     retrieved and edited later. Draft records are NOT visible to admins.
//
//     Request body:
//     {
//       "academicYearId": "string",
//       "termId": "string",
//       "scheduleId": "string",
//       "classId": "string",
//       "subjectId": "string",
//       "periodId": "string",
//       "teacherId": "string",
//       "date": "YYYY-MM-DD",
//       "attendanceId": "string | null",   // include if updating an existing draft
//       "attendances": [
//         {
//           "studentId": "string",
//           "status": "present | absent | late | null",
//           "reason": "string",
//           "lateArrivalTime": "HH:mm | empty string"
//         }
//       ]
//     }
//
//     Expected response:
//     {
//       "success": true,
//       "data": {
//         "attendanceId": "string",
//         "status": "draft",
//         "savedAt": "ISO8601"
//       }
//     }
// ───────────────────────────────────────────────────────────────────────────
export async function saveDraftAttendance(payload) {
  if (ATTENDANCE_BACKEND_LIVE) {
    const { data } = await apiClient.post('/api/teacher/attendance/draft', payload);
    return data;
  }

  // ── Mock (remove once backend is live) ────────────────────────────────────
  await delay(600);
  return {
    success: true,
    data: {
      attendanceId: payload.attendanceId || `att_draft_${Date.now()}`,
      status: 'draft',
      savedAt: new Date().toISOString(),
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// 4.  POST /api/teacher/attendance/submit
//
//     Finalises and locks an attendance record. Once submitted the record is
//     visible to admins and parents. Only a teacher (or admin) can edit it
//     afterwards via PUT /api/teacher/attendance/:attendanceId.
//
//     Request body: same shape as saveDraftAttendance.
//     Note: status for every student SHOULD be "present | absent | late"
//     (not null). Backend should reject records where all statuses are null.
//
//     Expected response:
//     {
//       "success": true,
//       "data": {
//         "attendanceId": "string",
//         "status": "submitted",
//         "submittedAt": "ISO8601",
//         "summary": {
//           "total": 30,
//           "present": 25,
//           "absent": 3,
//           "late": 2
//         }
//       }
//     }
// ───────────────────────────────────────────────────────────────────────────
export async function submitAttendance(payload) {
  if (ATTENDANCE_BACKEND_LIVE) {
    const { data } = await apiClient.post('/api/teacher/attendance/submit', payload);
    return data;
  }

  // ── Mock ──────────────────────────────────────────────────────────────────
  await delay(800);
  const summary = (payload.attendances || []).reduce(
    (acc, a) => {
      acc.total++;
      if (a.status === 'present') acc.present++;
      else if (a.status === 'absent') acc.absent++;
      else if (a.status === 'late')   acc.late++;
      return acc;
    },
    { total: 0, present: 0, absent: 0, late: 0 }
  );

  return {
    success: true,
    data: {
      attendanceId: payload.attendanceId || `att_${Date.now()}`,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      summary,
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// 5.  PUT /api/teacher/attendance/:attendanceId
//
//     Edits a previously submitted attendance record. The backend should log
//     an audit trail entry (who changed what, at what time).
//
//     Path params:
//       attendanceId — the ID returned by submitAttendance
//
//     Request body:
//     {
//       "editReason": "string (optional — reason for the correction)",
//       "attendances": [
//         {
//           "studentId": "string",
//           "status": "present | absent | late",
//           "reason": "string",
//           "lateArrivalTime": "HH:mm | empty string"
//         }
//       ]
//     }
//
//     Expected response:
//     {
//       "success": true,
//       "data": {
//         "attendanceId": "string",
//         "status": "submitted",
//         "updatedAt": "ISO8601",
//         "summary": {
//           "total": 30,
//           "present": 25,
//           "absent": 3,
//           "late": 2
//         }
//       }
//     }
// ───────────────────────────────────────────────────────────────────────────
export async function updateAttendance(attendanceId, payload) {
  if (ATTENDANCE_BACKEND_LIVE) {
    const { data } = await apiClient.put(`/api/teacher/attendance/${attendanceId}`, payload);
    return data;
  }

  // ── Mock ──────────────────────────────────────────────────────────────────
  await delay(600);
  const summary = (payload.attendances || []).reduce(
    (acc, a) => {
      acc.total++;
      if (a.status === 'present') acc.present++;
      else if (a.status === 'absent') acc.absent++;
      else if (a.status === 'late')   acc.late++;
      return acc;
    },
    { total: 0, present: 0, absent: 0, late: 0 }
  );

  return {
    success: true,
    data: {
      attendanceId,
      status: 'submitted',
      updatedAt: new Date().toISOString(),
      summary,
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// 6.  GET /api/teacher/attendance/history
//
//     Returns a paginated list of submitted attendance records for this teacher.
//     Useful for the attendance history / audit view.
//
//     Query params (all optional):
//       page       — page number (default: 1)
//       limit      — records per page (default: 20)
//       classId    — filter by class
//       subjectId  — filter by subject
//       startDate  — ISO date YYYY-MM-DD (inclusive)
//       endDate    — ISO date YYYY-MM-DD (inclusive)
//       status     — "submitted" | "draft" | "all" (default: "submitted")
//
//     Expected response:
//     {
//       "success": true,
//       "data": {
//         "records": [
//           {
//             "attendanceId": "string",
//             "scheduleId": "string",
//             "classId": "string",
//             "className": "string",
//             "subjectId": "string",
//             "subjectName": "string",
//             "date": "YYYY-MM-DD",
//             "periodNumber": 1,
//             "status": "submitted | draft",
//             "submittedAt": "ISO8601 | null",
//             "summary": {
//               "total": 30,
//               "present": 25,
//               "absent": 3,
//               "late": 2
//             }
//           }
//         ],
//         "pagination": {
//           "page": 1,
//           "limit": 20,
//           "total": 150,
//           "totalPages": 8
//         }
//       }
//     }
// ───────────────────────────────────────────────────────────────────────────
export async function getAttendanceHistory({ page = 1, limit = 20, classId, subjectId, startDate, endDate, status = 'submitted' } = {}) {
  if (ATTENDANCE_BACKEND_LIVE) {
    const { data } = await apiClient.get('/api/teacher/attendance/history', {
      params: { page, limit, classId, subjectId, startDate, endDate, status },
    });
    return data;
  }

  // ── Mock ──────────────────────────────────────────────────────────────────
  await delay(400);
  return {
    success: true,
    data: {
      records: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// 7.  GET /api/teacher/attendance/date/:date
//
//     Returns all attendance records (submitted + drafts) for a specific date.
//     Useful for loading the board state when a teacher revisits a past date.
//
//     Path params:
//       date — ISO date YYYY-MM-DD
//
//     Expected response:
//     {
//       "success": true,
//       "data": {
//         "date": "YYYY-MM-DD",
//         "academicContext": { ... },
//         "scheduledClasses": [ ... ] // same shape as getScheduledClasses
//       }
//     }
// ───────────────────────────────────────────────────────────────────────────
export async function getAttendanceByDate(date) {
  if (ATTENDANCE_BACKEND_LIVE) {
    const { data } = await apiClient.get(`/api/teacher/attendance/date/${date}`);
    return data;
  }

  // ── Fallback: re-use getScheduledClasses ──────────────────────────────────
  return getScheduledClasses(date);
}

// ───────────────────────────────────────────────────────────────────────────
// 8.  GET /api/teacher/attendance/summary/:scheduleId
//
//     Returns a summary of attendance for a specific past session.
//     Used to hydrate the class board card (presentCount, absentCount, etc.)
//     after a session has been submitted.
//
//     Path params:
//       scheduleId — the schedule identifier
//
//     Expected response:
//     {
//       "success": true,
//       "data": {
//         "scheduleId": "string",
//         "attendanceId": "string",
//         "attendanceStatus": "submitted",
//         "submittedAt": "ISO8601",
//         "summary": {
//           "total": 30,
//           "present": 25,
//           "absent": 3,
//           "late": 2
//         }
//       }
//     }
// ───────────────────────────────────────────────────────────────────────────
export async function getAttendanceSummary(scheduleId) {
  if (ATTENDANCE_BACKEND_LIVE) {
    const { data } = await apiClient.get(`/api/teacher/attendance/summary/${scheduleId}`);
    return data;
  }

  // ── Mock ──────────────────────────────────────────────────────────────────
  await delay(300);
  return {
    success: true,
    data: {
      scheduleId,
      attendanceId: null,
      attendanceStatus: 'not_started',
      submittedAt: null,
      summary: { total: 0, present: 0, absent: 0, late: 0 },
    },
  };
}
