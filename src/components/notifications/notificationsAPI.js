import apiClient from '../../utils/axiosConfig.js';

const messageOf = (err, fallback) => new Error(err?.response?.data?.message || fallback);

/** { unreadCount, notifications: [{ id, type, title, body, isRead, createdAt, link }] } */
export async function listNotifications({ limit = 10 } = {}) {
    try {
        const { data } = await apiClient.get('/api/notifications', { params: { limit } });
        return data.data;
    } catch (err) { throw messageOf(err, 'Could not load notifications.'); }
}

export async function markNotificationRead(id) {
    try { await apiClient.patch(`/api/notifications/${id}/read`); } catch (err) { throw messageOf(err, 'Could not update the notification.'); }
}

export async function markAllNotificationsRead() {
    try { await apiClient.patch('/api/notifications/read-all'); } catch (err) { throw messageOf(err, 'Could not mark notifications as read.'); }
}
