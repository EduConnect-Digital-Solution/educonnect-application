import apiClient from '../../../../utils/axiosConfig.js';

/**
 * ───────────────────────────────
 * Subject APIs  —  /api/academic/subjects
 * ───────────────────────────────
 *
 * FEATURE FLAG:
 *   Set SUBJECTS_BACKEND_LIVE = true once the backend is deployed.
 *
 * CATEGORY VALUES  (matches newFeatures.md):
 *   'core' | 'elective' | 'optional' | 'religious'
 *
 * UNIFIED DELETE FORMAT:
 *   deleteSubjects() accepts a single string OR an array of strings.
 *   The deprecated deleteSubject(id) shim wraps it for backward compat.
 *
 * ID NORMALISATION:
 *   Live backend returns _id.  normalizeId() maps it to id so the context
 *   state shape stays consistent with the rest of the frontend.
 */

export const SUBJECTS_BACKEND_LIVE = true;

const delay = (ms = 400) => new Promise(r => setTimeout(r, ms));

// ── Category constants ──────────
export const SUBJECT_CATEGORIES = ['core', 'elective', 'optional', 'religious'];

export const CATEGORY_LABELS = {
  core:      'Core',
  elective:  'Elective',
  optional:  'Optional',
  religious: 'Religious',
};

export const CATEGORY_STYLES = {
  core:      'bg-blue-50 text-blue-700 border border-blue-200',
  elective:  'bg-violet-50 text-violet-700 border border-violet-200',
  optional:  'bg-amber-50 text-amber-700 border border-amber-200',
  religious: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

// ── ID normalisation helpers (live-mode only) ─────────────────────────────────
const normalizeId = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const { _id, ...rest } = obj;
  return _id ? { id: _id, _id, ...rest } : obj;
};
const normalizeList = (list) =>
  Array.isArray(list) ? list.map(normalizeId) : list;

// ── Code auto-generator helper ──
/**
 * Derives a short subject code from the subject name.
 * Multi-word names → initials (e.g. "Basic Science" → "BS")
 * Single word      → first 3 letters (e.g. "Mathematics" → "MAT")
 */
export function autoGenerateCode(name = '', currentCodes = []) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  let code = '';

  if (words.length >= 2) {
    code = words
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 4);
  } else {
    code = name.trim().substring(0, 3).toUpperCase();
  }

  // Handle collisions
  let finalCode = code;
  let counter = 1;

  while (currentCodes.includes(finalCode)) {
    // If "BS" exists, try "BS1", then "BS2", etc.
    const suffix = counter.toString();
    finalCode = code.slice(0, 4 - suffix.length) + suffix;
    counter++;
  }

  return finalCode;
}

// =============================================================================
// GET /api/academic/subjects
// Returns all school-wide subjects.
// =============================================================================
export async function getSchoolSubjects() {


  if (SUBJECTS_BACKEND_LIVE) {
    const { data } = await apiClient.get('/api/academic/subjects');
    if (data.success) data.data.subjects = normalizeList(data.data.subjects);
    return data;
  }

  await delay();
  return { success: true, data: { subjects: [], total: 0 } };
}

// =============================================================================
// POST /api/academic/subjects  (bulk creation)
//
// Payload:
//   {
//     subjects: [
//       { name: string, code: string, description?: string, category?: string }
//     ]
//   }
//
// newFeatures.md note: "Add Auto Generate button in UI" — see autoGenerateCode().
//
// Response (201):
//   { success, message, data: { subjects: [...], total, errors: [] } }
// =============================================================================
export async function bulkCreateSubjects(payload) {

  if (SUBJECTS_BACKEND_LIVE) {
    const { data } = await apiClient.post('/api/academic/subjects', payload);
    if (data.success) data.data.subjects = normalizeList(data.data.subjects);
    return data;
  }

  await delay(800);

  const ts = Date.now();
  const generated = payload.subjects.map((s, i) => ({
    id: `subj_${ts}_${i}`,
    _id: `subj_${ts}_${i}`,
    name: s.name,
    code: s.code || autoGenerateCode(s.name),
    description: s.description || '',
    category: SUBJECT_CATEGORIES.includes(s.category) ? s.category : 'core',
  }));

  return {
    success: true,
    message: `${generated.length} subject(s) created successfully`,
    data: { subjects: generated, total: generated.length, errors: [] },
  };
}

// =============================================================================
// POST /api/academic/subjects  (single — thin wrapper around bulk)
//
// Payload: { name, code?, description?, category? }
// Response: { success, data: { subject: {...} } }
// =============================================================================
export async function createSubject(payload) {

  const res = await bulkCreateSubjects({ subjects: [payload] });

  if (res.success && res.data.subjects.length > 0) {
    return { success: true, data: { subject: res.data.subjects[0] } };
  }

  // Propagate partial-success / error response as-is
  return res;
}

// =============================================================================
// PUT /api/academic/subjects/:subjectId
//
// Payload: { name?, code?, description?, category? }
// Response: { success, message, data: { updated subject } }
// =============================================================================
export async function updateSubject(subjectId, payload) {

  if (SUBJECTS_BACKEND_LIVE) {
    const { data } = await apiClient.put(`/api/academic/subjects/${subjectId}`, payload);
    if (data.success) data.data = normalizeId(data.data);
    return data;
  }

  await delay();
  return {
    success: true,
    message: 'Subject updated successfully',
    data: { id: subjectId, ...payload },
  };
}

// =============================================================================
// DELETE /api/academic/subjects
// Unified format: subjectIds may be a single string OR an array of strings.
//
// Body sent:   { subjectIds: ['id1', 'id2'] }
// Response:    { success, message, data: { deleted, errors } }
// =============================================================================
export async function deleteSubjects(subjectIds) {
  const ids = Array.isArray(subjectIds) ? subjectIds : [subjectIds];

  if (SUBJECTS_BACKEND_LIVE) {
    const { data } = await apiClient.delete('/api/academic/subjects', {
      data: { subjectIds: ids },
    });
    return data;
  }

  await delay();
  return {
    success: true,
    message: `${ids.length} subject(s) deleted successfully`,
    data: { deleted: ids.length, errors: [] },
  };
}

// =============================================================================
// DEPRECATED SHIM
// =============================================================================
/**
 * @deprecated  Use deleteSubjects(ids) with the unified format.
 */
export async function deleteSubject(subjectId) {
  console.warn(
    '⚠️  deleteSubject(id) is deprecated. Call deleteSubjects(id) instead.'
  );
  return deleteSubjects(subjectId);
}
