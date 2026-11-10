import apiClient from '../../../../utils/axiosConfig.js';

// GET /api/admin/attendance/overview?date=&from=&to=&minAbsences=
export async function getAttendanceOverview(params) {
    try {
        const { data } = await apiClient.get('/api/admin/attendance/overview', { params });
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}
