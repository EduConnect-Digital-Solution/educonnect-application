import apiClient from '../../../../utils/axiosConfig.js';

// GET /api/admin/reports/board?termId=&from=&to=&sections=a,b
export async function getBoardReport({ termId, from, to, sections }) {
    try {
        const { data } = await apiClient.get('/api/admin/reports/board', {
            params: { termId: termId || undefined, from: from || undefined, to: to || undefined, sections: sections?.join(',') || undefined },
        });
        return data;
    } catch (error) {
        const body = error?.response?.data;
        throw { ...(body || {}), message: body?.message || error?.message || 'Could not build the report.' };
    }
}
