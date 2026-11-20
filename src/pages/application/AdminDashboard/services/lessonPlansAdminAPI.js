/** Admin side of lesson plans: read every plan in the school and open its files (each open is audited). */
import apiClient from '../../../../utils/axiosConfig.js';

const call = async (request, fallback) => {
    try {
        const { data } = await request;
        return data?.data ?? null;
    } catch (error) {
        const body = error?.response?.data;
        throw new Error(body?.message || error?.message || fallback);
    }
};

const BASE = '/api/admin/lesson-plans';

/** Resolves to { plans, truncated }. Filters (classId, subjectId, teacherId, q) are applied on the server. */
export const listLessonPlans = (filters = {}) => call(apiClient.get(BASE, { params: filters }), 'Could not load lesson plans.');
/** Every class, subject and teacher that has a plan: { classes, subjects, teachers } of { id, name }. */
export const getLessonPlanFilters = () => call(apiClient.get(`${BASE}/filters`), 'Could not load the filters.');
export const getLessonPlan = async (id) => (await call(apiClient.get(`${BASE}/${id}`), 'Could not open this lesson plan.')).plan;
export const getAdminFileLink = (planId, fileId) => call(apiClient.post(`${BASE}/${planId}/files/${fileId}/link`), 'The file could not be opened.');
