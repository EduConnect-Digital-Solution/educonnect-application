import apiClient from '../../../../utils/axiosConfig.js';

// Resolves to { success, data }; rejects with { message, blocked? } from the server.
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

export const getSubjectMapping = () => call(apiClient.get('/api/academic/subject-mapping'));
export const saveSubjectMapping = (assignments) => call(apiClient.put('/api/academic/subject-mapping', { assignments }));
