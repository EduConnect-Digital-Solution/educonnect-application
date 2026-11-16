import axios from 'axios';

import { API_BASE_URL as baseURL } from './apiConfig';
import { getAuthBridge, REQUEST_TIMEOUT_MS } from './authBridge';

// Create axios instance
const apiClient = axios.create({
    baseURL,
    withCredentials: true,
    // Without a limit a stalled connection would leave a screen loading forever
    timeout: REQUEST_TIMEOUT_MS,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

// Sign-in, sign-up and password flows. They are used while signed out, so they never carry an
// access token, and a 401 from them means "wrong details", never "your session expired".
const SIGNED_OUT_ENDPOINTS = [
    '/api/school/auth/login',
    '/api/user/auth/login',
    '/api/school/auth/register',
    '/api/school/auth/verify-email',
    '/api/school/auth/resend-otp',
    '/api/school/auth/forgot-password',
    '/api/school/auth/reset-password',
    '/api/user/auth/forgot-password',
    '/api/user/auth/reset-password',
    '/api/user/auth/complete-registration',
];

// Session endpoints that work from the httpOnly cookie alone
const COOKIE_ONLY_ENDPOINTS = [
    '/api/user/auth/me',
    '/api/school/auth/logout',
    '/api/school/auth/refresh-token',
];

const matches = (url, endpoints) => endpoints.some(endpoint => url?.includes(endpoint));
export const isSignedOutEndpoint = (url) => matches(url, SIGNED_OUT_ENDPOINTS);

// Request interceptor to add access token
apiClient.interceptors.request.use(
    async (config) => {
        const authContext = getAuthBridge();

        // Skip token attachment for endpoints that do not use one
        if (isSignedOutEndpoint(config.url) || matches(config.url, COOKIE_ONLY_ENDPOINTS)) {
            return config;
        }

        // A request retried after a refresh already carries the fresh token; the context here may still hold the old one
        if (config._retry && config.headers?.Authorization) {
            return config;
        }

        // For all other endpoints, ensure we have a valid access token
        if (authContext && authContext.getValidAccessToken) {
            try {
                const token = await authContext.getValidAccessToken();
                if (token && token !== 'session-valid') {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch (error) {
                console.error('Failed to get valid access token:', error);
            }
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Requests that never reached a handler (cancelled, misconfigured) have nothing to retry
        if (!originalRequest) {
            return Promise.reject(error);
        }

        // If this was a signed-out auth endpoint (login, register, password reset, ...), don't attempt
        // to refresh tokens or redirect the user — just reject so callers can show the server's message.
        if (isSignedOutEndpoint(originalRequest.url)) {
            return Promise.reject(error);
        }

        // Handle 401 errors (token expired or invalid)
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Prevent infinite loops
            if (originalRequest.url?.includes('/refresh-token') ||
                originalRequest.url?.includes('/auth/me')) {
                // If refresh or session check failed, logout
                const authContext = getAuthBridge();
                if (authContext && authContext.logout) {
                    await authContext.logout();
                }
                window.location.href = '/';
                return Promise.reject(error);
            }

            if (isRefreshing) {
                // If already refreshing, queue the request
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest._retry = true;
                    if (token && token !== 'session-valid') {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                    }
                    return apiClient(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const authContext = getAuthBridge();

                if (!authContext || !authContext.refreshAccessToken) {
                    throw new Error('Auth context unavailable');
                }

                let newToken = await authContext.refreshAccessToken(true);
                // A network blip or server hiccup is not a rejected session: retry once before giving up
                if (!newToken && !authContext.isSessionRejected?.()) {
                    await new Promise(r => setTimeout(r, 1000));
                    newToken = await authContext.refreshAccessToken(true);
                }

                if (newToken && newToken !== 'session-valid') {
                    processQueue(null, newToken);
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    return apiClient(originalRequest);
                }
                const failure = new Error('Failed to refresh token');
                failure.sessionRejected = Boolean(authContext.isSessionRejected?.());
                throw failure;
            } catch (refreshError) {
                processQueue(refreshError, null);

                // Sign out only when the server rejected the session. A transient failure just fails this request.
                if (refreshError.sessionRejected && navigator.onLine) {
                    const authContext = getAuthBridge();
                    if (authContext && authContext.logout) {
                        await authContext.logout();
                    }
                    window.location.href = '/';
                }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
