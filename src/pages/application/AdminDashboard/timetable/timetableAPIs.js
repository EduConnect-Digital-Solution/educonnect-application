/**
 * Timetable & Academic Calendar API Stubs
 * ───────────────────────────────
 * Every function logs its exact payload / URL so the backend developer has a
 * clear specification to implement against.
 *
 * Replace the stub returns with real apiClient calls once endpoints are live.
 *
 * FEATURE FLAG:
 *   Set TIMETABLE_BACKEND_LIVE = true once the backend is deployed.
 *   getScheduledClasses() in attendanceAPIs.js reads this flag to switch from
 *   synthetic schedule generation to GET /api/teacher/timetable/today.
 */

import apiClient from '../../../../utils/axiosConfig';



// Academic Profile
export async function getAcademicProfile() {
  const { data } = await apiClient.get('/api/school/profile');
  return data;
}

export async function setAcademicContext(yearID) {
  const { data } = await apiClient.put(`/api/academic/years/${yearID}/current`);
  return data;
}

// Academic Years and Terms Config
export async function getAcademicYears() {
  const { data } = await apiClient.get('/api/academic/years');
  return data;
}

export async function createAcademicYear(payload) {
  const { data } = await apiClient.post('/api/academic/years', payload);
  return data;
}

export async function updateAcademicYear(id, payload) {
  const { data } = await apiClient.put(`/api/admin/academic-years/${id}`, payload);
  return data;
}

export async function deleteAcademicYear(id) {
  const { data } = await apiClient.delete(`/api/admin/academic-years/${id}`);
  return data;
}

export async function getTerms(academicYearId) {
  const { data } = await apiClient.get('/api/academic/terms', { params: { academicYearId } });
  return data;
}

export async function createTerm(payload) {
  const { data } = await apiClient.post('/api/academic/terms', payload);
  return data;
}

export async function updateTerm(id, payload) {
  const { data } = await apiClient.put(`/api/admin/terms/${id}`, payload);
  return data;
}

export async function setCurrentTerm(id) {
    const { data } = await apiClient.put(`/api/academic/terms/${id}/current`);
    return data;
}

export async function deleteTerm(id) {
  const { data } = await apiClient.delete(`/api/admin/terms/${id}`);
  return data;
}


// School Events
export async function getEvents(termId) {
  const { data } = await apiClient.get('/api/admin/events', { params: { termId } });
  return data;
}

export async function createEvent(payload) {
  const { data } = await apiClient.post('/api/admin/events', payload);
  return data;
}

export async function updateEvent(eventId, payload) {
  const { data } = await apiClient.put(`/api/admin/events/${eventId}`, payload);
  return data;
}

export async function deleteEvent(eventId) {
  const { data } = await apiClient.delete(`/api/admin/events/${eventId}`);
  return data;
}

export async function updateEventNotificationSettings(eventId, payload) {
  const { data } = await apiClient.put(`/api/admin/events/${eventId}/notifications`, payload);
  return data;
}

export async function getEventNotificationsConfig(eventId) {
  const { data } = await apiClient.get(`/api/admin/events/${eventId}/notifications`);
  return data;
}

export async function sendNotificationOverride(eventId, payload) {
  const { data } = await apiClient.post(`/api/admin/events/${eventId}/notify`, payload);
  return data;
}

export async function getNotificationLogs(eventId, status) {
  const { data } = await apiClient.get('/api/admin/notifications/logs', { params: { eventId, status } });
  return data;
}

// Timetable Matters
export async function getTimetableDraft(classId, termId, armId = null) {
  const params = { classId, termId, ...(armId ? { armId } : {}) };
  const { data } = await apiClient.get('/api/admin/timetable/draft', { params });
  return data;
}

export async function saveTimetableDraft(payload) {
  const { data } = await apiClient.post('/api/admin/timetable/draft', payload);
  return data;
}

export async function deleteTimetableDraft(classId, termId, armId = null) {
  const params = { classId, termId, ...(armId ? { armId } : {}) };
  const { data } = await apiClient.delete('/api/admin/timetable/draft', { params });
  return data;
}

export async function checkConflicts(payload) {
  const { data } = await apiClient.post('/api/admin/timetable/check-conflicts', payload);
  return data;
}

export async function publishTimetable(payload) {
  const { data } = await apiClient.post('/api/admin/timetable/publish', payload);
  return data;
}

export async function getPublishedTimetable(classId, termId, armId = null) {
  const params = { classId, termId, ...(armId ? { armId } : {}) };
  const { data } = await apiClient.get('/api/admin/timetable/published', { params });
  return data;
}

/**
 * Fetch EVERY published timetable in the school — no class/term/arm filter.
 * Same endpoint as getPublishedTimetable, just without params.
 * Returns the raw array: [{ id, classId, termId, armId, publishedAt, periods, schedules }].
 */
export async function getAllPublishedTimetables() {
  const { data } = await apiClient.get('/api/admin/timetable/published');
  return data?.data?.timetables ?? [];
}

/**
 * Delete a published timetable by its id.
 * NOTE: backend endpoint may still be pending — see README. Mirrors the draft delete.
 */
export async function deletePublishedTimetable(timetableId) {
  const { data } = await apiClient.delete(`/api/admin/timetable/published/${timetableId}`);
  return data;
}

// =============================================================================
// TEACHER DAILY SCHEDULE
// GET /api/teacher/timetable/today
// This endpoint ultimately powers getScheduledClasses() in attendanceAPIs.js
// Response shape MUST match what getScheduledClasses() returns.
// =============================================================================

export async function getTeacherDailySchedule(date = new Date().toISOString().split('T')[0]){
  const { data } = await apiClient.get('/api/teacher/timetable/today', { params: { date } });
  return data;
}
