/**
 * Data layer for the school-admin Settings screens: locale, attendance policy, audit log,
 * and data import / export.
 */
import apiClient from '../../../../utils/axiosConfig.js';

const unwrap = (err, fallback) => {
    const data = err?.response?.data;
    return new Error(data?.errors?.[0]?.msg || data?.message || fallback);
};

export async function getSettings() {
    try {
        const { data } = await apiClient.get('/api/school/settings');
        return data.data;
    } catch (err) { throw unwrap(err, 'Could not load settings'); }
}

export async function getLocaleLock() {
    try {
        const { data } = await apiClient.get('/api/school/settings/locale');
        return Boolean(data.data?.currencyLocked);
    } catch { return false; }
}

/** Partial update of one section: 'locale' | 'attendancePolicy' | 'notificationDefaults'. */
export async function saveSettingsSection(section, patch) {
    try {
        const { data } = await apiClient.put(`/api/school/settings/${section}`, patch);
        return data.data;
    } catch (err) { throw unwrap(err, 'Could not save settings'); }
}

/** Formatting and attendance hints for any signed-in user. */
export async function getPublicSettings() {
    const { data } = await apiClient.get('/api/school/settings/public');
    return data.data;
}

/* ─── Audit log ─────────── */
export async function listAuditLogs(params = {}) {
    try {
        const { data } = await apiClient.get('/api/admin/audit-logs', { params });
        return data.data;
    } catch (err) { throw unwrap(err, 'Could not load the audit log'); }
}

/* ─── Downloads (CSV) ─────────── */
const saveBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const download = async (url, filename, params) => {
    try {
        const { data } = await apiClient.get(url, { params, responseType: 'blob' });
        saveBlob(data, filename);
    } catch (err) {
        // A blob error body must be read as text to show its message
        let message = 'Download failed';
        try { message = JSON.parse(await err.response.data.text()).message || message; } catch { /* keep default */ }
        throw new Error(message);
    }
};

export const exportAuditLogCsv = (params) => download('/api/admin/audit-logs/export.csv', 'audit-log.csv', params);
export const downloadImportTemplate = (kind) => download(`/api/admin/data/import/${kind}/template`, `${kind}-template.csv`);
export const exportStudentsCsv = () => download('/api/admin/data/export/students.csv', 'students.csv');
export const exportTeachersCsv = () => download('/api/admin/data/export/teachers.csv', 'teachers.csv');

/** Upload a CSV. dryRun = check only, nothing is imported. */
export async function importCsv(kind, file, { dryRun }) {
    const form = new FormData();
    form.append('file', file);
    try {
        const { data } = await apiClient.post(`/api/admin/data/import/${kind}`, form, {
            params: dryRun ? { dryRun: 'true' } : undefined,
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data.data;
    } catch (err) { throw unwrap(err, 'The file could not be processed'); }
}
