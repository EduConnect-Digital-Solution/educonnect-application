import apiClient from '../../../../utils/axiosConfig.js';

// POST /api/admin/attendance/:id/reopen  restarts the teacher's edit window for a submitted register
export async function reopenRegister(sessionId) {
    try {
        const { data } = await apiClient.post(`/api/admin/attendance/${sessionId}/reopen`);
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}

// GET /api/admin/attendance/overview?date=&from=&to=&minAbsences=
export async function getAttendanceOverview(params) {
    try {
        const { data } = await apiClient.get('/api/admin/attendance/overview', { params });
        return data;
    } catch (error) {
        throw error?.response?.data || error;
    }
}
