import apiClient from '../../../../utils/axiosConfig.js';


// ── ID normalisation helpers (live-mode only) ─────────────────────────────────
const normalizeId = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const { _id, ...rest } = obj;
  return _id ? { id: _id, _id, ...rest } : obj;
};
const normalizeList = (list) =>
  Array.isArray(list) ? list.map(normalizeId) : list;

// =============================================================================
// GET /api/academic/classes
// Returns all base class levels for the school.
// =============================================================================
export async function getSchoolClasses() {
  const { data } = await apiClient.get('/api/academic/classes');
  if (data.success) data.data.classes = normalizeList(data.data.classes);
  return data;
}

// =============================================================================
// GET /api/academic/classes/:classId
// =============================================================================
export async function getClassById(classId) {
  const { data } = await apiClient.get(`/api/academic/classes/${classId}`);
  if (data.success) data.data = normalizeId(data.data);
  return data;
}

// =============================================================================
// POST /api/academic/classes
// Creates one or more base class levels.
//
// Payload:
//   { classes: [{ name: 'JSS1', level: 1, description?: string }] }
//
// Response (201):
//   { success, message, data: { classes: [...], total, errors: [] } }
// =============================================================================
export async function createClasses(payload) {
  const { data } = await apiClient.post('/api/academic/classes', payload);
  if (data.success) data.data.classes = normalizeList(data.data.classes);
  return data;
}

// =============================================================================
// PUT /api/academic/classes/:classId
// =============================================================================
export async function updateClass(classId, payload) {
  const { data } = await apiClient.put(`/api/academic/classes/${classId}`, payload);
  if (data.success) data.data = normalizeId(data.data);
  return data;
}

// =============================================================================
// DELETE /api/academic/classes
// Unified format: classIds may be a single string OR an array of strings.
//
// Body sent:   { classIds: ['id1', 'id2'] }
// Response:    { success, message, data: { deleted, errors } }
// =============================================================================
export async function deleteClasses(classIds) {
  const ids = Array.isArray(classIds) ? classIds : [classIds];

  const results = await Promise.all(
      ids.map(id => apiClient.delete(`/api/academic/classes/${id}`))
  );
  const last = results[results.length - 1].data;
  return { ...last, data: { deleted: results.length, errors: [] } };
}

// =============================================================================
// GET /api/academic/classes/:classId/subjects
// Returns the union of subjects assigned to all arms under the given class.
// =============================================================================
export async function getClassSubjects(classId) {
  const { data } = await apiClient.get(`/api/academic/classes/${classId}/subjects`);
  if (data.success) data.data.subjects = normalizeList(data.data.subjects);
  return data;
}

// =============================================================================
// POST /api/academic/classes/:classId/subjects
// Adds subjects to ALL arms under the class (class-wide assignment).
//
// subjectIds: string | string[]
// Effect:     broadcasts to every arm under the class
// =============================================================================
export async function addSubjectsToClass(classId, subjectIds) {
  const ids = Array.isArray(subjectIds) ? subjectIds : [subjectIds];

  const { data } = await apiClient.post(`/api/academic/classes/${classId}/subjects`, {
    subjectIds: ids,
  });
  return data;
}
