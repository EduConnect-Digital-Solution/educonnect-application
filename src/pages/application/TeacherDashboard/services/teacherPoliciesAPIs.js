/**
 * teacherPoliciesAPIs.js — Teacher: Self-Managed Assessment Policies
 *
 * Teachers who have been granted permission by the admin can create, update,
 * delete and assign their own assessment policies — scoped to their class only.
 *
 * Live endpoints (backend not yet built — activate by uncommenting apiClient calls):
 *   GET    /api/teacher/my-policy-permission
 *   GET    /api/teacher/my-policies
 *   POST   /api/teacher/my-policies
 *   PUT    /api/teacher/my-policies/:id
 *   DELETE /api/teacher/my-policies/:id
 *   POST   /api/teacher/my-policies/:id/assignments
 *   DELETE /api/teacher/my-policies/:id/assignments/:assignmentId
 *
 * Helper fetches (re-used from other APIs when live):
 *   getMyClassArms()  — arms within the teacher's granted class
 *   getMySubjects()   — subjects the teacher is assigned to (for subject_class scope)
 *
 * See newGradingandScoring.md §6 for full request/response contracts.
 */

import apiClient from '../../../../utils/axiosConfig.js';

// ─── In-memory store ────────────────────────────────────────────────────────────
//
// Mock: this teacher (Kenechukwu Ajufo) has been granted permission for SS 2.

const _myPermission = {
    granted:      true,
    permissionId: 'perm_001',
    classId:      'e4d61b2d-e50c-41cc-b442-bf7e3f099703',
    className:    'SS 2',
    grantedAt:    '2026-06-20T10:00:00.000Z',
};

// Arms available within the teacher's granted class (SS 2)
const _myClassArms = [
    { id: 'arm_ss2a_uuid', name: 'A', className: 'SS 2', classId: 'e4d61b2d-e50c-41cc-b442-bf7e3f099703' },
    { id: 'arm_ss2b_uuid', name: 'B', className: 'SS 2', classId: 'e4d61b2d-e50c-41cc-b442-bf7e3f099703' },
    { id: 'arm_ss2c_uuid', name: 'C', className: 'SS 2', classId: 'e4d61b2d-e50c-41cc-b442-bf7e3f099703' },
];

// Subjects this teacher is assigned to (used to build subject_class scope picker)
const _mySubjects = [
    { id: 'subj_english_uuid', name: 'English Language' },
    { id: 'subj_lit_uuid',     name: 'Literature in English' },
];

// Policies this teacher has created — mutable store
const _policies = [
    {
        id: 'tpol_001',
        name: 'SS 2 Standard (40 CA / 60 Exam)',
        description: 'Custom CA weighting for SS 2',
        caComponents: [
            { id: 'tcomp_001', name: '1st CA Test',  maxScore: 15, sortOrder: 0 },
            { id: 'tcomp_002', name: '2nd CA Test',  maxScore: 15, sortOrder: 1 },
            { id: 'tcomp_003', name: 'Project Work', maxScore: 10, sortOrder: 2 },
        ],
        caMax:   40,
        examMax: 60,
        total:   100,
        assignments: [
            {
                id:                 'tassign_001',
                scope:              'class',
                scopeId:            'e4d61b2d-e50c-41cc-b442-bf7e3f099703',
                scopeName:          'SS 2',
                secondaryScopeId:   null,
                secondaryScopeName: null,
            },
        ],
        createdAt: '2026-06-21T09:00:00.000Z',
        updatedAt: '2026-06-21T09:00:00.000Z',
    },
    {
        id: 'tpol_002',
        name: 'SS 2A Special (30 CA / 70 Exam)',
        description: 'Stricter exam weighting used only for arm A',
        caComponents: [
            { id: 'tcomp_004', name: '1st CA Test', maxScore: 15, sortOrder: 0 },
            { id: 'tcomp_005', name: 'Class Quiz',  maxScore: 15, sortOrder: 1 },
        ],
        caMax:   30,
        examMax: 70,
        total:   100,
        assignments: [
            {
                id:                 'tassign_002',
                scope:              'arm',
                scopeId:            'arm_ss2a_uuid',
                scopeName:          'A',
                secondaryScopeId:   null,
                secondaryScopeName: null,
            },
        ],
        createdAt: '2026-06-22T14:00:00.000Z',
        updatedAt: '2026-06-22T14:00:00.000Z',
    },
];

// Index by ID for O(1) lookups; shared object references so mutations are visible
// to both the array and the map without a separate sync step.
const _policiesById = new Map(_policies.map(p => [p.id, p]));

let _nextPolId    = 3;
let _nextAssignId = 3;
let _nextCompId   = 6;

function _delay(ms = 320) {
    return new Promise(r => setTimeout(r, ms));
}

// ─── Permission check ──────────────────────────────────────────────────────────

/**
 * Check if the authenticated teacher has been granted policy-creation permission.
 * Called on Teacher Dashboard mount to decide whether to show the nav item and
 * by scoreEntryAPIs.getEffectivePolicy to enforce the isolation rule.
 */
export async function getMyPolicyPermission() {
    try {
        return await apiClient.get('/api/teacher/my-policy-permission');
    } catch (error) {
        throw error?.response?.data || error;
    }
    // await _delay(200);
    // return { data: _myPermission };
}

// ─── Helper: class arms + teacher subjects ────────────────────────────────────

/**
 * Arms within the teacher's granted class. Used to populate the arm picker
 * in the AddAssignmentForm.
 */
export async function getMyClassArms() {
    try {
        const permRes = await apiClient.get('/api/teacher/my-policy-permission');
        const classId = permRes.data.classId;
        return await apiClient.get(`/api/admin/classes/${classId}/arms`);
    } catch (error) {
        throw error?.response?.data || error;
    }
    // await _delay(200);
    // return { data: { arms: [..._myClassArms] } };
}

/**
 * Subjects the teacher is assigned to teach. Used to populate the
 * subject picker when scope = 'subject_class'.
 */
export async function getMySubjects() {
    try {
        return await apiClient.get('/api/teacher/subjects');
    } catch (error) {
        throw error?.response?.data || error;
    }
    // await _delay(200);
    // return { data: { subjects: [..._mySubjects] } };
}

// ─── List policies ─────────────────────────────────────────────────────────────

export async function listMyPolicies() {
    try {
        return await apiClient.get('/api/teacher/my-policies');
    } catch (error) {
        throw error?.response?.data || error;
    }
    // await _delay();
    // return { data: { policies: [..._policiesById.values()] } };
}

// ─── Create policy ─────────────────────────────────────────────────────────────

/**
 * @param {{ name: string, description?: string, caComponents: Array<{name,maxScore,sortOrder}>, examMax: number }} payload
 */
export async function createMyPolicy(payload) {
    try {
        return await apiClient.post('/api/teacher/my-policies', payload);
    } catch (error) {
        throw error?.response?.data || error;
    }
    // await _delay(450);
    //
    // const id    = `tpol_00${_nextPolId++}`;
    // const caMax = payload.caComponents.reduce((s, c) => s + Number(c.maxScore), 0);
    // const policy = {
    //     id,
    //     name:         payload.name,
    //     description:  payload.description ?? '',
    //     caComponents: payload.caComponents.map((c, i) => ({
    //         id:        `tcomp_0${String(_nextCompId++).padStart(2, '0')}`,
    //         name:      c.name,
    //         maxScore:  Number(c.maxScore),
    //         sortOrder: i,
    //     })),
    //     caMax,
    //     examMax:   Number(payload.examMax),
    //     total:     caMax + Number(payload.examMax),
    //     assignments: [],
    //     createdAt: new Date().toISOString(),
    //     updatedAt: new Date().toISOString(),
    // };
    //
    // _policies.push(policy);
    // _policiesById.set(id, policy);
    // return { data: { policy } };
}

// ─── Update policy ─────────────────────────────────────────────────────────────

/**
 * @param {string} policyId
 * @param {{ name?: string, description?: string, caComponents?: Array, examMax?: number }} payload
 */
export async function updateMyPolicy(policyId, payload) {
    try {
        return await apiClient.put(`/api/teacher/my-policies/${policyId}`, payload);
    } catch (error) {
        throw error?.response?.data || error;
    }
//     await _delay(400);
//
//     const policy = _policiesById.get(policyId);
//     if (!policy) throw new Error('Policy not found.');
//
//     if (payload.name        !== undefined) policy.name        = payload.name;
//     if (payload.description !== undefined) policy.description = payload.description;
//     if (payload.examMax     !== undefined) policy.examMax     = Number(payload.examMax);
//
//     if (payload.caComponents) {
//         policy.caComponents = payload.caComponents.map((c, i) => ({
//             id:        c.id ?? `tcomp_0${String(_nextCompId++).padStart(2, '0')}`,
//             name:      c.name,
//             maxScore:  Number(c.maxScore),
//             sortOrder: i,
//         }));
//         policy.caMax = policy.caComponents.reduce((s, c) => s + c.maxScore, 0);
//     }
//
//     policy.total     = policy.caMax + policy.examMax;
//     policy.updatedAt = new Date().toISOString();
//     return { data: { policy } };
}

// ─── Delete policy ─────────────────────────────────────────────────────────────

export async function deleteMyPolicy(policyId) {
    try {
        return await apiClient.delete(`/api/teacher/my-policies/${policyId}`);
    } catch (error) {
        throw error?.response?.data || error;
    }
    // await _delay();
    // const idx = _policies.findIndex(p => p.id === policyId);
    // if (idx !== -1) _policies.splice(idx, 1);
    // _policiesById.delete(policyId);
    // return { data: { deleted: true } };
}

// ─── Assignments ───────────────────────────────────────────────────────────────

/**
 * Add a scope assignment to a teacher's policy.
 *
 * Allowed scopes for teacher policies:
 *   'class'         — all arms in the teacher's granted class (no scopeId needed)
 *   'arm'           — specific arm: { scopeId: armId, scopeName: 'A' }
 *   'subject_class' — specific subject × teacher's class: { scopeId: subjectId, scopeName: 'English Language' }
 *
 * @param {string} policyId
 * @param {{ scope: 'class'|'arm'|'subject_class', scopeId?: string, scopeName?: string }} payload
 */
export async function addMyPolicyAssignment(policyId, payload) {
    try {
        return await apiClient.post(`/api/teacher/my-policies/${policyId}/assignments`, payload);
    } catch (error) {
        throw error?.response?.data || error;
    }
    // await _delay(380);
    //
    // const policy = _policiesById.get(policyId);
    // if (!policy) throw new Error('Policy not found.');
    //
    // // For 'class' scope, fill in the teacher's own class automatically
    // const scopeId   = payload.scope === 'class' ? _myPermission.classId  : payload.scopeId;
    // const scopeName = payload.scope === 'class' ? _myPermission.className : payload.scopeName;
    //
    // const assignment = {
    //     id:                 `tassign_0${String(_nextAssignId++).padStart(2, '0')}`,
    //     scope:              payload.scope,
    //     scopeId,
    //     scopeName,
    //     secondaryScopeId:   null,
    //     secondaryScopeName: null,
    // };
    //
    // policy.assignments.push(assignment);
    // return { data: { assignment } };
}

/**
 * @param {string} policyId
 * @param {string} assignmentId
 */
export async function removeMyPolicyAssignment(policyId, assignmentId) {
    try {
        return await apiClient.delete(`/api/teacher/my-policies/${policyId}/assignments/${assignmentId}`);
    } catch (error) {
        throw error?.response?.data || error;
    }
    // await _delay();

    // const policy = _policiesById.get(policyId);
    // if (!policy) throw new Error('Policy not found.');
    //
    // policy.assignments = policy.assignments.filter(a => a.id !== assignmentId);
    // return { data: { removed: true } };
}
