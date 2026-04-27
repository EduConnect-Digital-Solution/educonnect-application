import axios from 'axios';

const baseURL = import.meta.env.DEV
    ? ''
    : 'https://educonnect-backend-t7j1.onrender.com';

// Create axios instance
const apiClient = axios.create({
    baseURL,
    withCredentials: true,
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

// Request interceptor to add access token
apiClient.interceptors.request.use(
    async (config) => {
        const authContext = window.authContext;

        // Skip token attachment for public endpoints
        const publicEndpoints = [
            '/api/user/auth/me',
            '/api/school/auth/login',
            '/api/school/auth/logout',
            '/api/school/auth/register',
            '/api/school/auth/verify-email'
        ];
        const isPublicEndpoint = publicEndpoints.some(endpoint => config.url?.includes(endpoint));

        if (isPublicEndpoint) {
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

        // If this was a public auth endpoint (e.g. login/register), don't attempt
        // to refresh tokens or redirect the user — just reject so callers can handle it.
        const publicResponseEndpoints = [
            '/api/school/auth/login',
            '/api/user/auth/login',
            '/api/school/auth/register',
            '/api/school/auth/verify-email'
        ];
        if (publicResponseEndpoints.some(ep => originalRequest?.url?.includes(ep))) {
            return Promise.reject(error);
        }

        // Handle 401 errors (token expired or invalid)
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Prevent infinite loops
            if (originalRequest.url?.includes('/refresh-token') ||
                originalRequest.url?.includes('/auth/me')) {
                // If refresh or session check failed, logout
                const authContext = window.authContext;
                if (authContext && authContext.logout) {
                    await authContext.logout();
                }
                window.location.href = '/login/welcome';
                return Promise.reject(error);
            }

            if (isRefreshing) {
                // If already refreshing, queue the request
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
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
                const authContext = window.authContext;

                if (authContext && authContext.refreshAccessToken) {
                    const newToken = await authContext.refreshAccessToken(true);

                    if (newToken && newToken !== 'session-valid') {
                        processQueue(null, newToken);
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        return apiClient(originalRequest);
                    } else {
                        throw new Error('Failed to refresh token');
                    }
                }
            } catch (refreshError) {
                processQueue(refreshError, null);

                // Only logout if online; if offline, allow continued use with cached auth
                if (navigator.onLine) {
                    const authContext = window.authContext;
                    if (authContext && authContext.logout) {
                        await authContext.logout();
                    }
                    window.location.href = '/login';
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