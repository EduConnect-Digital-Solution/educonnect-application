import apiClient from '../../../../utils/axiosConfig.js';

const unwrap = (err, fallback) => new Error(err?.response?.data?.message || fallback);

/** Every period of one day for one child, with the mark for each. date = YYYY-MM-DD. */
export async function getChildDay(childId, date) {
    try {
        const { data } = await apiClient.get(`/api/parent/children/${childId}/attendance/day`, { params: date ? { date } : undefined });
        return data.data;
    } catch (err) { throw unwrap(err, 'Could not load attendance for that day.'); }
}
