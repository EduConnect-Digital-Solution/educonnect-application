/**
 * Data layer for a teacher's lesson plans and notes. Files are private: opening one asks the server for a link
 * that expires in a minute.
 */
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

const BASE = '/api/teacher/lesson-plans';

/** The classes, subjects, arms and terms this teacher may write plans for. */
export const getLessonPlanOptions = () => call(apiClient.get(`${BASE}/options`), 'Could not load your classes and subjects.');
/** Resolves to { plans, truncated }. Class and subject filters are applied on the server. */
export const listMyLessonPlans = (filters = {}) => call(apiClient.get(BASE, { params: filters }), 'Could not load your lesson plans.');
export const getMyLessonPlan = async (id) => (await call(apiClient.get(`${BASE}/${id}`), 'Could not open this lesson plan.')).plan;
export const createLessonPlan = async (body) => (await call(apiClient.post(BASE, body), 'Could not save the lesson plan.')).plan;
export const updateLessonPlan = async (id, body) => (await call(apiClient.put(`${BASE}/${id}`, body), 'Could not save the lesson plan.')).plan;
export const deleteLessonPlan = (id) => call(apiClient.delete(`${BASE}/${id}`), 'Could not delete the lesson plan.');

export const uploadLessonFile = async (planId, file) => {
    const form = new FormData();
    form.append('file', file);
    return (await call(apiClient.post(`${BASE}/${planId}/files`, form, { headers: { 'Content-Type': 'multipart/form-data' } }), 'The file could not be uploaded.')).file;
};
export const getMyFileLink = (planId, fileId) => call(apiClient.post(`${BASE}/${planId}/files/${fileId}/link`), 'The file could not be opened.');
export const deleteLessonFile = (planId, fileId) => call(apiClient.delete(`${BASE}/${planId}/files/${fileId}`), 'The file could not be deleted.');
