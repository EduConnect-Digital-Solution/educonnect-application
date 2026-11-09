import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';

const AuthContext = createContext();

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

    // const baseURL = 'https://educonnect-backend-t7j1.onrender.com';
    const baseURL = 'https://educonnect-backend-staging.onrender.com';

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
            refreshAccessToken(true);
        }, timeUntilRefresh);
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
                setUser(normalizeUser(userData));

                // Try to get an access token, but DO NOT log out if this fails
                // /me already confirmed the session is valid
                try {
                    const tokenResponse = await axios.post(
                        `${baseURL}/api/school/auth/refresh-token`,
                        {},
                        { withCredentials: true }
                    );

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

            const response = await axios.post(
                `${baseURL}/api/school/auth/refresh-token`,
                {},
                { withCredentials: true }
            );

            if (response.data.success) {
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
            if (error.response?.status === 401 || error.response?.status === 403) {
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

        setAccessToken(token);
        setUser(normalizeUser(loginData.data.user));
        setTokenExpiry(expiry);
        scheduleTokenRefresh(expiry);
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
        checkAuthStatus,
        getValidAccessToken,
        isAuthenticated: !!user && !!accessToken,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};