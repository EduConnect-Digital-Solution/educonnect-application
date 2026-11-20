/**
 * policyPermissionsAPIs.js — Admin: Teacher Policy Delegation
 *
 * 1. Permission management: which teachers may create their own assessment
 *    policies, and for which class.
 * 2. Admin read-only view of the policies teachers have created.
 *
 *   GET    /api/admin/policy-permissions
 *   POST   /api/admin/policy-permissions        { teacherId, classId }
 *   DELETE /api/admin/policy-permissions/:id
 *   GET    /api/admin/teacher-policies?classId=
 *
 * Every function resolves to the response body ({ success, data }) and rejects with
 * the server's error body ({ message, errors? }) so callers can show e.message.
 */
import apiClient from '../../../../utils/axiosConfig.js';
import { getDashboardUsers } from '../../../auth/authAPIs.js';
import { getSchoolClasses } from './classAPIs.js';

const unwrap = async (request) => {
    try {
        const { data } = await request;
        return data;
    } catch (error) {
        const body = error?.response?.data;
        const detail = Array.isArray(body?.errors) && body.errors.length
            ? body.errors.map(e => e.message || e.msg).filter(Boolean).join(', ')
            : null;
        throw { ...(body || {}), message: detail || body?.message || error?.message || 'Request failed' };
    }
};

/**
 * The classes a teacher is assigned to, as { id, name }.
 * Teacher assignments are stored by class name, so they are matched to the school's classes.
 */
export async function getTeacherClassAssignments(teacherId) {
    const [usersRes, classesRes] = await Promise.all([
        getDashboardUsers('teacher', ''),
        getSchoolClasses(),
    ]);
    const teacher = (usersRes.data?.users ?? []).find(u => u.id === teacherId);
    // Entries are { className, arms? } for staff, plain names are accepted too
    const assigned = new Set((teacher?.classes ?? []).map(c => (typeof c === 'string' ? c : c.className)));
    const classes = (classesRes.data?.classes ?? [])
        .filter(c => assigned.has(c.name))
        .map(c => ({ id: c.id, name: c.name }));
    return { data: { classes } };
}

export const listPolicyPermissions = () => unwrap(apiClient.get('/api/admin/policy-permissions'));

/** @param {{ teacherId: string, classId: string }} payload */
export const grantPolicyPermission = ({ teacherId, classId }) =>
    unwrap(apiClient.post('/api/admin/policy-permissions', { teacherId, classId }));

export const revokePolicyPermission = (permissionId) =>
    unwrap(apiClient.delete(`/api/admin/policy-permissions/${permissionId}`));

/** @param {{ classId?: string }} [options] */
export const listTeacherCreatedPolicies = ({ classId } = {}) =>
    unwrap(apiClient.get('/api/admin/teacher-policies', { params: classId ? { classId } : {} }));
