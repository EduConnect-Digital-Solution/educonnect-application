import apiClient from '../../../../utils/axiosConfig.js';

/**
 * ───────────────────────────────
 * Arm APIs  —  /api/academic/arms  &  /api/academic/classes/:classId/arms
 * ───────────────────────────────
 *
 * FEATURE FLAG:
 *   Set ARMS_BACKEND_LIVE = true once the backend endpoints are deployed.
 *
 * UNIFIED ID FORMAT:
 *   All delete / assign / copy endpoints accept a single string OR an array.
 *
 * ARM SUBJECTS:
 *   Each Arm tracks its own subject list independently.  This enables SSS arms
 *   (Science / Art / Commercial) to carry different subjects while JSS arms
 *   share the same set.
 *
 *   add     →  POST /api/academic/arms/:armId/subjects           (additive)
 *   replace →  POST /api/academic/arms/:armId/subjects/replace   (full swap)
 *   copy    →  POST /api/academic/arms/:srcId/subjects/copy      (copy src → targets)
 *
 * ID NORMALISATION:
 *   normalizeId maps _id → id so state always uses `id`.
 */

// ── ID normalisation helpers (live-mode only) ─────────────────────────────────
const normalizeId = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const { _id, ...rest } = obj;
  return _id ? { id: _id, _id, ...rest } : obj;
};
const normalizeList = (list) =>
  Array.isArray(list) ? list.map(normalizeId) : list;

// =============================================================================
// POST /api/academic/arms
// Creates one or more arms (class sections).
//
// Payload:
//   {
//     arms: [
//       { classId: string, name: string, classTeacherId?: string }
//     ]
//   }
//
// Response (201):
//   { success, message, data: { arms: [...], total, errors: [] } }
// =============================================================================
export async function createArms(payload) {
  const { data } = await apiClient.post('/api/academic/arms', payload);
  if (data.success) data.data.arms = normalizeList(data.data.arms);
  return data;
}

// =============================================================================
// GET /api/academic/classes/:classId/arms
// Returns all arms (sections) belonging to the given class.
// =============================================================================
export async function getClassArms(classId) {
  const { data } = await apiClient.get(`/api/academic/classes/${classId}/arms`);
  if (data.success) data.data.arms = normalizeList(data.data.arms);
  return data;
}

// =============================================================================
// PUT /api/academic/arms/:armId
//
// Payload: { name?: string, classTeacherId?: string }
// Response: { success, message, data: { updated arm } }
// =============================================================================
export async function updateArm(armId, payload) {
  const { data } = await apiClient.put(`/api/academic/arms/${armId}`, payload);
  if (data.success) data.data = normalizeId(data.data);
  return data;
}

// =============================================================================
// DELETE /api/academic/arms
// Unified format: armIds may be a single string OR an array of strings.
//
// Body sent:   { armIds: ['id1', 'id2'] }
// Response:    { success, message, data: { deleted, errors } }
// =============================================================================
export async function deleteArms(armIds) {
  const { data } = await apiClient.delete('/api/academic/arms', {
    data: { armIds: ids },
  });
  return data;
}

// =============================================================================
// ARM SUBJECTS
// =============================================================================

// -----------------------------------------------------------------------------
// GET /api/academic/arms/:armId/subjects
// Returns subjects currently assigned to this arm.
// -----------------------------------------------------------------------------
export async function getArmSubjects(armId) {
  const { data } = await apiClient.get(`/api/academic/arms/${armId}/subjects`);
  if (data.success) data.data.subjects = normalizeList(data.data.subjects);
  return data;
}

// -----------------------------------------------------------------------------
// POST /api/academic/arms/:armId/subjects
// ADDITIVE — appends subjects to the arm's existing list.
//
// subjectIds: string | string[]
// Response:   { success, message, data: { added: [...], errors: [] } }
// -----------------------------------------------------------------------------
export async function addSubjectsToArm(armId, subjectIds) {
  const ids = Array.isArray(subjectIds) ? subjectIds : [subjectIds];

  const { data } = await apiClient.post(`/api/academic/arms/${armId}/subjects`, {
    subjectIds: ids,
  });
  return data;
}

// -----------------------------------------------------------------------------
// POST /api/academic/arms/:armId/subjects/replace
// DESTRUCTIVE — replaces ALL existing subjects on the arm with the new set.
//
// subjectIds: string[]
// Response:   { success, message, data: { armId, armName, subjects, errors } }
// -----------------------------------------------------------------------------
export async function replaceArmSubjects(armId, subjectIds) {
  const ids = Array.isArray(subjectIds) ? subjectIds : [subjectIds];

  const { data } = await apiClient.post(
      `/api/academic/arms/${armId}/subjects/replace`,
      { subjectIds: ids }
  );
  return data;
}

// -----------------------------------------------------------------------------
// POST /api/academic/arms/:sourceArmId/subjects/copy
// Copies ALL subjects from sourceArm to one or more target arms.
// Useful for JSS classes where every section shares the same subjects.
//
// targetArmIds: string | string[]
// Response:     { success, message, data: { sourceArmId, sourceArmName,
//                 subjectsCopied, results: [...], errors: [] } }
// -----------------------------------------------------------------------------
export async function copySubjectsToArms(sourceArmId, targetArmIds) {
  const ids = Array.isArray(targetArmIds) ? targetArmIds : [targetArmIds];

  const { data } = await apiClient.post(
      `/api/academic/arms/${sourceArmId}/subjects/copy`,
      { targetArmIds: ids }
  );
  return data;
}
