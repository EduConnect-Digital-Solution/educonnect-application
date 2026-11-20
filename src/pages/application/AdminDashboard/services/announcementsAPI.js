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

export const listAnnouncements  = () => call(apiClient.get('/api/admin/announcements'));
export const createAnnouncement = (payload) => call(apiClient.post('/api/admin/announcements', payload));
export const updateAnnouncement = (id, payload) => call(apiClient.put(`/api/admin/announcements/${id}`, payload));
export const sendAnnouncement   = (id) => call(apiClient.post(`/api/admin/announcements/${id}/send`));
export const deleteAnnouncement = (id) => call(apiClient.delete(`/api/admin/announcements/${id}`));
export const getAudienceSize    = (audience, classIds = []) =>
    call(apiClient.get('/api/admin/announcements/audience', { params: { audience, classIds: classIds.join(',') || undefined } }));
