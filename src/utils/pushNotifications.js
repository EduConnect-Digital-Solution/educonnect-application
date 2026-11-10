/**
 * Web push for the installed PWA: ask permission, subscribe through the service worker, and tell
 * the backend. Needs the server's VAPID keys; until they are set the backend answers 503 and
 * support() reports "unavailable".
 */
import apiClient from './axiosConfig.js';

const toUint8 = (base64) => {
    const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(padded);
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const registration = async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return reg || navigator.serviceWorker.ready;
};

/** 'unsupported' | 'denied' | 'on' | 'off' */
export async function pushStatus() {
    if (!pushSupported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    try {
        const sub = await (await registration()).pushManager.getSubscription();
        return sub ? 'on' : 'off';
    } catch { return 'off'; }
}

export async function enablePush() {
    if (!pushSupported()) throw new Error('This browser cannot receive push notifications. On iPhone, add EduConnect to the home screen first.');
    const keyRes = await apiClient.get('/api/push/public-key').catch((e) => {
        throw new Error(e?.response?.status === 503 ? 'Push notifications are not switched on for EduConnect yet.' : 'Could not reach the server.');
    });
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them in your browser settings and try again.');
    const reg = await registration();
    const sub = (await reg.pushManager.getSubscription())
        || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8(keyRes.data.data.publicKey) });
    await apiClient.post('/api/push/subscribe', sub.toJSON());
    return true;
}

export async function disablePush() {
    if (!pushSupported()) return;
    const sub = await (await registration()).pushManager.getSubscription();
    if (!sub) return;
    await apiClient.delete('/api/push/subscribe', { data: { endpoint: sub.endpoint } }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
}
