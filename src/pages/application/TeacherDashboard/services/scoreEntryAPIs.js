import apiClient from '../../../../utils/axiosConfig.js';
import { getMyPolicyPermission, listMyPolicies } from './teacherPoliciesAPIs.js';

// Re-export existing teacher APIs so ScoreEntryPage has one import for everything
export {
    getTeacherClasses,
    getSubjectsByClass,
    getStudentsByClassandSubject,
} from '../../../auth/authAPIs.js';

/**
 * GET /api/teacher/effective-policy?className=JSS1&subjectName=Mathematics
 *
 * Returns the most specific Assessment Policy that covers this class/subject pair.
 *
 * ISOLATION RULE: If this teacher has been granted policy-creation permission for
 * the requested class, admin-created policies are NEVER returned — only the
 * teacher's own policies apply. If the teacher has permission but no policy yet,
 * returns { policy: null, hasPermission: true } so the UI can prompt them to
 * create one. Teachers without delegation see admin-resolved policies as normal.
 *
 * Resolution for teacher-delegated classes (highest → lowest priority):
 *   1. Teacher policy: subject_class scope matching subjectName
 *   2. Teacher policy: class-wide scope
 *   → null if neither exists (teacher must create a policy first)
 *
 * Resolution for non-delegated classes (admin-defined, backend resolves):
 *   subject_class > subject > arm > class > school (default)
 *
 * Response shape:
 * {
 *   data: {
 *     policy: { id, name, caComponents, caMax, examMax } | null,
 *     source: 'teacher' | 'admin' | null,
 *     hasPermission: boolean,   // true = teacher owns policy authoring for this class
 *   }
 * }
 */
export async function getEffectivePolicy(className, subjectName) {
    // ── Step 1: Check if this teacher has delegation permission for this class ──
    const permRes = await getMyPolicyPermission().catch(() => ({ data: { granted: false } }));
    const perm = permRes.data;

    if (perm?.granted && perm.className === className) {
        // Teacher has permission for this class → admin policies MUST NOT apply.
        const policiesRes = await listMyPolicies().catch(() => ({ data: { policies: [] } }));
        const myPolicies  = policiesRes.data?.policies ?? [];

        // Priority: subject_class match > class-wide match
        const resolved =
            myPolicies.find(p =>
                p.assignments?.some(a => a.scope === 'subject_class' && a.scopeName === subjectName),
            ) ??
            myPolicies.find(p =>
                p.assignments?.some(a => a.scope === 'class'),
            ) ??
            null;

        return {
            data: {
                policy:        resolved,
                source:        resolved ? 'teacher' : null,
                hasPermission: true,
            },
        };
    }

    // ── Step 2: No delegation — call real backend (admin-resolved) ────────────
    // When the backend implements the isolation rule it will also reject this call
    // for delegated teachers server-side, but that guard is client-side above for now.
    try {
        const { data } = await apiClient.get('/api/teacher/effective-policy', {
            params: { className, subjectName },
        });
        // Normalise: ensure hasPermission field exists even if backend omits it
        return {
            data: { ...(data.data ?? {}), hasPermission: false, source: 'admin' },
        };
    } catch (error) {
        throw error?.response?.data || error;
    }
}

/**
 * GET /api/teacher/score-sheets?className=...&subjectName=...&termId=...
 *
 * Returns the existing score sheet for this class/subject/term, or null.
 * Expected response:
 * {
 *   success: true,
 *   data: {
 *     sheet: {
 *       id: string,
 *       status: 'draft' | 'submitted' | 'returned' | 'approved',
 *       returnNote: string | null,
 *       entries: [{
 *         studentId: string,
 *         caScores: { [componentId]: number },
 *         examScore: number,
 *         remark: string | null,   // optional teacher remark, visible to admin
 *       }],
 *       submittedAt: string | null,
 *       updatedAt: string,
 *     } | null
 *   }
 * }
 */
export async function getScoreSheet(className, subjectName, termId) {
    // MOCK
    try {
        const { data } = await apiClient.get('/api/teacher/score-sheets', {
            params: { className, subjectName, termId },
        });
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

/**
 * POST /api/teacher/score-sheets
 * Creates a new score sheet with status 'draft'.
 *
 * payload: { className: string, subjectName: string, termId: string }
 * Response: { success, data: { sheet: { id, status: 'draft', entries: [], returnNote: null } } }
 */
export async function createScoreSheet(payload) {
    // MOCK
    try {
        const { data } = await apiClient.post('/api/teacher/score-sheets', payload);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }

}

/**
 * PUT /api/teacher/score-sheets/:sheetId
 * Saves the current entries as a draft. Does NOT change status.
 *
 * payload: {
 *   entries: [{
 *     studentId: string,
 *     caScores: { [componentId]: number },  // key = caComponent.id
 *     examScore: number,
 *     remark: string | null,                // optional teacher remark (max 300 chars);
 *                                           //   null = no remark / clear existing
 *   }]
 * }
 * Response: { success, data: { sheet: { id, status, updatedAt } } }
 */
export async function saveScoreEntries(sheetId, entries) {
    // MOCK
    try {
        const { data } = await apiClient.put(`/api/teacher/score-sheets/${sheetId}`, { entries });
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }

}

/**
 * POST /api/teacher/score-sheets/:sheetId/submit
 * Transitions the sheet from 'draft' (or 'returned') → 'submitted' for admin review.
 * Backend should validate that no entry has scores exceeding policy limits.
 *
 * Response: { success, data: { sheet: { id, status: 'submitted', submittedAt: string } } }
 */
export async function submitScoreSheet(sheetId) {
    // MOCK
    try {
        const { data } = await apiClient.post(`/api/teacher/score-sheets/${sheetId}/submit`);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }

}
