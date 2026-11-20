import apiClient from '../../../../utils/axiosConfig.js';

/** The logged-in teacher's published periods for the current term, grouped Monday to Friday. */
export async function getMyWeekSchedule() {
    try {
        const { data } = await apiClient.get('/api/teacher/timetable/week');
        return data?.data ?? null;
    } catch (error) {
        const body = error?.response?.data;
        throw { ...(body || {}), message: body?.message || error?.message || 'Could not load your timetable.' };
    }
}
