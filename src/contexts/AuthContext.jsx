import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/apiConfig';

const AuthContext = createContext();

// ── Session limits ─────────────────────────────────────────────────────────────
// The server enforces these too (idle + absolute). The app mirrors them so people are warned
// and signed out cleanly instead of finding out on their next click.
const DEFAULT_IDLE_MINUTES = Number(import.meta.env.VITE_IDLE_TIMEOUT_MINUTES) || 30;
const WARNING_MS = 2 * 60 * 1000;          // warn this long before the idle sign-out
const HEARTBEAT_MS = 4 * 60 * 1000;        // tell the server we are active at most this often
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tokenExpiry, setTokenExpiry] = useState(null);
    const refreshTimerRef = useRef(null);
    // One refresh request at a time: load, timer, request interceptor and 401 handler all share it
    const refreshInFlightRef = useRef(null);
    // True only when the server itself rejected the session (401/403), not on network errors or 5xx
    const sessionRejectedRef = useRef(false);

    // Idle tracking: when the user last did something, and what the server says the limits are
    const lastActivityRef = useRef(Date.now());
    const lastHeartbeatRef = useRef(Date.now());
    const policyRef = useRef({ idleMs: DEFAULT_IDLE_MINUTES * 60 * 1000, expiresAt: null });
    const [idleWarning, setIdleWarning] = useState(null); // seconds left, or null when not warning

    const baseURL = API_BASE_URL;

    // Normalize user object to ensure name/fullName are available for UI
    const normalizeUser = (u) => {
        if (!u) return u;
        const fullNameFromParts = (u.firstName || u.lastName)
            ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
            : null;
        const fullName = u.fullName || fullNameFromParts || u.name || null;
        const name = u.name || fullName;
        return { ...u, fullName, name };
    };

    // Helper: decode JWT and get expiry timestamp (ms)
    const getTokenExpiry = (token) => {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000;
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    };

    // Helper: is token expired or expiring within bufferMinutes?
    const isTokenExpiredOrExpiringSoon = (expiry, bufferMinutes = 5) => {
        if (!expiry) return true;
        return expiry <= Date.now() + bufferMinutes * 60 * 1000;
    };

    // Schedule a token refresh before expiry
    const scheduleTokenRefresh = (expiry) => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        if (!expiry) return;

        const timeUntilRefresh = Math.max(expiry - Date.now() - 5 * 60 * 1000, 10_000);
        refreshTimerRef.current = setTimeout(() => {
            // Only keep the session alive for someone who is actually here; the idle check signs the rest out
            if (Date.now() - lastActivityRef.current > policyRef.current.idleMs) return;
            refreshAccessToken(true);
        }, timeUntilRefresh);
    };

    // The server tells us its idle limit and when this session ends no matter what
    const applySessionInfo = (info) => {
        if (!info) return;
        policyRef.current = {
            idleMs: info.idleTimeoutMinutes ? info.idleTimeoutMinutes * 60 * 1000 : policyRef.current.idleMs,
            expiresAt: info.expiresAt ? Date.parse(info.expiresAt) : null,
        };
    };

    const postRefresh = () => {
        if (!refreshInFlightRef.current) {
            refreshInFlightRef.current = axios
                .post(`${baseURL}/api/school/auth/refresh-token`, {}, { withCredentials: true })
                .finally(() => { refreshInFlightRef.current = null; });
        }
        return refreshInFlightRef.current;
    };

    // Check session via /auth/me — primary method on app load
    const checkAuthStatus = async () => {
        try {
            const response = await axios.get(
                `${baseURL}/api/user/auth/me`,
                { withCredentials: true }
            );

            if (response.data.success && response.data.user) {
                const userData = response.data.user;
                applySessionInfo(response.data.session);
                lastActivityRef.current = Date.now();
                setUser(normalizeUser(userData));

                // Try to get an access token, but DO NOT log out if this fails
                // /me already confirmed the session is valid
                try {
                    const tokenResponse = await postRefresh();

                    if (tokenResponse.data.success) {
                        const newToken = tokenResponse.data.data.tokens.accessToken;
                        const expiry = getTokenExpiry(newToken);
                        setAccessToken(newToken);
                        setTokenExpiry(expiry);
                        scheduleTokenRefresh(expiry);
                    } else {
                        // Refresh failed but session is valid — stay logged in
                        setAccessToken('session-valid');
                    }
                } catch (refreshError) {
                    // Refresh failed but session is valid — stay logged in
                    // getValidAccessToken will retry on the next API call
                    console.warn('Could not get access token on load, will retry on next request:', refreshError);
                    setAccessToken('session-valid');
                }

                return userData;
            } else {
                clearAuthState();
                return null;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            // Only clear state if /me explicitly rejects — not on network errors
            if (error.response?.status === 401 || error.response?.status === 403) {
                clearAuthState();
            }
            return null;
        }
    };
    const clearAuthState = () => {
        setAccessToken(null);
        setUser(null);
        setTokenExpiry(null);
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };

    // Refresh access token using the httpOnly session cookie
    const refreshAccessToken = async (force = false) => {
        try {
            if (!force && tokenExpiry && !isTokenExpiredOrExpiringSoon(tokenExpiry)) {
                return accessToken;
            }

            const response = await postRefresh();

            if (response.data.success) {
                sessionRejectedRef.current = false;
                const newToken = response.data.data.tokens.accessToken;
                const userData = response.data.data.user;
                const expiry = getTokenExpiry(newToken);

                setAccessToken(newToken);
                setUser(normalizeUser(userData));
                setTokenExpiry(expiry);
                scheduleTokenRefresh(expiry);

                return newToken;
            }
            return null;
        } catch (error) {
            console.error('Token refresh failed:', error);
            const rejected = error.response?.status === 401 || error.response?.status === 403;
            sessionRejectedRef.current = rejected;
            if (rejected) {
                clearAuthState();
            }
            return null;
        }
    };

    // Get a guaranteed-valid access token, refreshing if needed
    const getValidAccessToken = async () => {
        if (
            !accessToken ||
            accessToken === 'session-valid' ||
            (tokenExpiry && isTokenExpiredOrExpiringSoon(tokenExpiry))
        ) {
            return await refreshAccessToken(true);
        }
        return accessToken;
    };

    // Login: called with the response data after a successful login API call
    const login = async (loginData) => {
        const token = loginData.data.tokens.accessToken;
        const expiry = getTokenExpiry(token);

        lastActivityRef.current = Date.now();
        lastHeartbeatRef.current = Date.now();
        setAccessToken(token);
        setUser(normalizeUser(loginData.data.user));
        setTokenExpiry(expiry);
        scheduleTokenRefresh(expiry);

        // The login response carries the internal school id; /me returns the school's
        // human-readable code and details, so pull them in once in the background.
        try {
            const me = await axios.get(`${baseURL}/api/user/auth/me`, { withCredentials: true });
            if (me.data?.success && me.data.user) {
                applySessionInfo(me.data.session);
                setUser((current) => normalizeUser({ ...(current || {}), ...me.data.user }));
            }
        } catch {
            /* keep the login response; the next page load refreshes it */
        }
    };

    // Logout: invalidate server session and clear local state
    const logout = async () => {
        try {
            await axios.post(
                `${baseURL}/api/school/auth/logout`,
                {},
                { withCredentials: true }
            );
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            clearAuthState();
        }
    };

    // End the session from this side (idle or absolute limit) and say why on the login page
    const expireSession = async (reason) => {
        try { sessionStorage.setItem('ec_signout_reason', reason); } catch { /* storage unavailable */ }
        setIdleWarning(null);
        await logout();
        window.location.assign('/');
    };

    // Tell the server the user is active (also confirms the session is still valid)
    const sendHeartbeat = async () => {
        lastHeartbeatRef.current = Date.now();
        try {
            const res = await axios.get(`${baseURL}/api/user/auth/me`, { withCredentials: true });
            applySessionInfo(res.data?.session);
        } catch (error) {
            if (error.response?.status === 401) expireSession('expired');
        }
    };

    const staySignedIn = () => {
        lastActivityRef.current = Date.now();
        setIdleWarning(null);
        sendHeartbeat();
    };

    // While signed in: notice activity, warn before the idle limit, sign out at the limits,
    // and send the server a heartbeat only while the user is actually active.
    const isSignedIn = !!user && !!accessToken;
    useEffect(() => {
        if (!isSignedIn) return undefined;

        let lastMark = 0;
        const markActivity = () => {
            const now = Date.now();
            if (now - lastMark > 1000) { lastMark = now; lastActivityRef.current = now; }
        };
        ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, markActivity, { passive: true }));

        const check = () => {
            const now = Date.now();
            const { idleMs, expiresAt } = policyRef.current;
            const idleFor = now - lastActivityRef.current;

            if (expiresAt && now >= expiresAt) return expireSession('expired');
            if (idleFor >= idleMs) return expireSession('idle');
            if (idleFor >= idleMs - WARNING_MS) setIdleWarning(Math.max(1, Math.ceil((idleMs - idleFor) / 1000)));
            else setIdleWarning(null);

            const activeSinceHeartbeat = lastActivityRef.current > lastHeartbeatRef.current;
            if (activeSinceHeartbeat && now - lastHeartbeatRef.current >= HEARTBEAT_MS) sendHeartbeat();
        };

        const onVisible = () => { if (document.visibilityState === 'visible') check(); };
        document.addEventListener('visibilitychange', onVisible);
        const timer = setInterval(check, 15 * 1000);

        return () => {
            ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, markActivity));
            document.removeEventListener('visibilitychange', onVisible);
            clearInterval(timer);
        };
    }, [isSignedIn]);

    // On mount: verify session once
    useEffect(() => {
        const init = async () => {
            await checkAuthStatus();
            setLoading(false);
        };
        init();

        return () => {
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        };
    }, []);

    const value = {
        user,
        accessToken,
        loading,
        login,
        logout,
        refreshAccessToken,
        isSessionRejected: () => sessionRejectedRef.current,
        checkAuthStatus,
        getValidAccessToken,
        isAuthenticated: !!user && !!accessToken,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
            {idleWarning !== null && (
                <div
                    role="alertdialog"
                    aria-live="assertive"
                    aria-label="You are about to be signed out"
                    className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md rounded-2xl border border-amber-200 bg-white shadow-2xl p-4"
                >
                    <p className="text-[14px] font-bold text-gray-900">Are you still there?</p>
                    <p className="mt-1 text-[13px] text-gray-600">
                        For your security you will be signed out in{' '}
                        <strong className="tabular-nums">
                            {Math.floor(idleWarning / 60)}:{String(idleWarning % 60).padStart(2, '0')}
                        </strong>{' '}
                        because there has been no activity.
                    </p>
                    <div className="mt-3 flex gap-2">
                        <button
                            type="button"
                            onClick={staySignedIn}
                            className="flex-1 h-9 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                            Stay signed in
                        </button>
                        <button
                            type="button"
                            onClick={() => expireSession('signed-out')}
                            className="h-9 px-4 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                        >
                            Sign out
                        </button>
                    </div>
                </div>
            )}
        </AuthContext.Provider>
    );
};