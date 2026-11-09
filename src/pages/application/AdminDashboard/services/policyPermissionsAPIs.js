/**
 * policyPermissionsAPIs.js — Admin: Teacher Policy Delegation
 *
 * Covers two concerns:
 *   1. Permission management — which teachers can create their own assessment policies
 *      and for which class.
 *   2. Admin read-only view of all teacher-created policies.
 *
 * Live endpoints (backend not yet built — activate by uncommenting apiClient calls):
 *   GET    /api/admin/policy-permissions
 *   POST   /api/admin/policy-permissions
 *   DELETE /api/admin/policy-permissions/:id
 *   GET    /api/admin/teacher-policies
 *
 * See newGradingandScoring.md §3.2 for full request/response contracts.
 */

import apiClient from '../../../../utils/axiosConfig.js';

// ─── In-memory store ────────────────────────────────────────────────────────────

const _permissions = [
    {
        id: 'perm_001',
        teacherId:   'fa616111-ed64-4b51-8e1c-ae6854fc6e0f',
        teacherName: 'Kenechukwu Ajufo',
        classId:     'e4d61b2d-e50c-41cc-b442-bf7e3f099703',
        className:   'SS 2',
        grantedAt:   '2026-06-20T10:00:00.000Z',
        policyCount: 1,
    },
    {
        id: 'perm_002',
        teacherId:   'bc7a9e12-3f4d-4a21-b9c8-2f1e7d8a4b93',
        teacherName: 'Adaeze Nwachukwu',
        classId:     '7f3c2b9a-1d4e-4f6a-a8b3-9c2d1e7f4a01',
        className:   'SS 3',
        grantedAt:   '2026-06-21T09:30:00.000Z',
        policyCount: 0,
    },
];

// Teacher-created policies (admin read-only view)
const _teacherPolicies = [
    {
        id:   'tpol_001',
        name: 'SS 2 Standard (40 CA / 60 Exam)',
        description: 'Custom CA weighting for SS 2',
        caComponents: [
            { id: 'tcomp_001', name: '1st CA Test',  maxScore: 15, sortOrder: 0 },
            { id: 'tcomp_002', name: '2nd CA Test',  maxScore: 15, sortOrder: 1 },
            { id: 'tcomp_003', name: 'Project Work', maxScore: 10, sortOrder: 2 },
        ],
        caMax: 40,
        examMax: 60,
        total: 100,
        assignments: [
            {
                id: 'tassign_001',
                scope: 'class',
                scopeId: 'e4d61b2d-e50c-41cc-b442-bf7e3f099703',
                scopeName: 'SS 2',
                secondaryScopeId: null,
                secondaryScopeName: null,
            },
        ],
        createdByRole:        'teacher',
        createdByTeacherId:   'fa616111-ed64-4b51-8e1c-ae6854fc6e0f',
        createdByTeacherName: 'Kenechukwu Ajufo',
        scopedClassId:        'e4d61b2d-e50c-41cc-b442-bf7e3f099703',
        scopedClassName:      'SS 2',
        createdAt:  '2026-06-21T09:00:00.000Z',
        updatedAt:  '2026-06-21T09:00:00.000Z',
    },
];

// Classes each teacher is assigned to — used to populate the class picker in the
// Grant Permission drawer. Live equivalent: GET /api/admin/staff/:id/class-assignments
const _teacherClassMap = {
    'fa616111-ed64-4b51-8e1c-ae6854fc6e0f': [
        { id: 'e4d61b2d-e50c-41cc-b442-bf7e3f099703', name: 'SS 2' },
        { id: '4a1b2c3d-9e0f-4b6a-a8c3-7d2e1f9b5a02', name: 'SS 1' },
    ],
    'bc7a9e12-3f4d-4a21-b9c8-2f1e7d8a4b93': [
        { id: '7f3c2b9a-1d4e-4f6a-a8b3-9c2d1e7f4a01', name: 'SS 3' },
    ],
};

let _nextPermId = 3;

function _delay(ms = 320) {
    return new Promise(r => setTimeout(r, ms));
}

// ─── 0. Classes assigned to a specific teacher (for Grant Permission drawer) ──

/**
 * Returns the classes a specific teacher is assigned to teach.
 * Live equivalent: GET /api/admin/staff/:teacherId/class-assignments
 * @param {string} teacherId
 */
export async function getTeacherClassAssignments(teacherId) {
    // return apiClient.get(`/api/admin/staff/${teacherId}/class-assignments`);
    await _delay(200);
    const classes = _teacherClassMap[teacherId] ?? [];
    return { data: { classes } };
}

// ─── 1. List all teacher policy permissions ────────────────────────────────────

export async function listPolicyPermissions() {
    // return apiClient.get('/api/admin/policy-permissions');
    await _delay();
    return { data: { permissions: [..._permissions] } };
}

// ─── 2. Grant permission to a teacher for a class ─────────────────────────────

/**
 * @param {{ teacherId: string, teacherName: string, classId: string, className: string }} payload
 */
export async function grantPolicyPermission(payload) {
    // return apiClient.post('/api/admin/policy-permissions', payload);
    await _delay(400);

    const duplicate = _permissions.find(
        p => p.teacherId === payload.teacherId && p.classId === payload.classId,
    );
    if (duplicate) {
        const err = new Error('This teacher already has permission for that class.');
        err.status = 409;
        throw err;
    }

    const newPerm = {
        id:          `perm_00${_nextPermId++}`,
        teacherId:   payload.teacherId,
        teacherName: payload.teacherName,
        classId:     payload.classId,
        className:   payload.className,
        grantedAt:   new Date().toISOString(),
        policyCount: 0,
    };
    _permissions.push(newPerm);
    return { data: { permission: newPerm } };
}

// ─── 3. Revoke a permission ────────────────────────────────────────────────────

export async function revokePolicyPermission(permissionId) {
    // return apiClient.delete(`/api/admin/policy-permissions/${permissionId}`);
    await _delay();
    const idx = _permissions.findIndex(p => p.id === permissionId);
    if (idx !== -1) _permissions.splice(idx, 1);
    return { data: { revoked: true } };
}

// ─── 4. Admin read-only view of all teacher-created policies ──────────────────

/**
 * @param {{ classId?: string }} [options]  Optional filter by class.
 */
export async function listTeacherCreatedPolicies({ classId } = {}) {
    // return apiClient.get('/api/admin/teacher-policies', { params: classId ? { classId } : {} });
    await _delay();
    const list = classId
        ? _teacherPolicies.filter(p => p.scopedClassId === classId)
        : [..._teacherPolicies];
    return { data: { policies: list } };
}
