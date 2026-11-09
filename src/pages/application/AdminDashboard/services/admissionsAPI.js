import apiClient from '../../../../utils/axiosConfig.js';

// Every call resolves to { success, data } and rejects with { message, errors? } from the server.
const call = async (request) => {
    try {
        const { data } = await request;
        return data;
    } catch (error) {
        const body = error?.response?.data;
        const offline = !error?.response && error?.message === 'Network Error';
        throw {
            ...(body || {}),
            message: offline
                ? 'Could not reach the server. Check your connection and try again.'
                : body?.message || error?.message || 'Something went wrong. Please try again.',
        };
    }
};

export const listApplicants   = (params) => call(apiClient.get('/api/admin/admissions', { params }));
export const createApplicant  = (payload) => call(apiClient.post('/api/admin/admissions', payload));
export const updateApplicant  = (id, payload) => call(apiClient.put(`/api/admin/admissions/${id}`, payload));
export const setApplicantStatus = (id, status, decisionNote) =>
    call(apiClient.post(`/api/admin/admissions/${id}/status`, { status, decisionNote }));
export const admitApplicant   = (id, payload) => call(apiClient.post(`/api/admin/admissions/${id}/admit`, payload));
export const deleteApplicant  = (id) => call(apiClient.delete(`/api/admin/admissions/${id}`));
