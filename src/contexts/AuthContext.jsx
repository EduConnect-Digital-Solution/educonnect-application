import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export function clearSWUserCache() {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;

    return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => resolve();
        navigator.serviceWorker.controller.postMessage(
            { type: 'CLEAR_USER_CACHE' },
            [channel.port2]
        );
        // Timeout fallback
        setTimeout(resolve, 500);
    });
}

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

    const baseURL = import.meta.env.DEV
        ? ''
        : 'https://educonnect-backend-t7j1.onrender.com';

    // Helper function to decode JWT and get expiry
    const getTokenExpiry = (token) => {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000; // Convert to milliseconds
        } catch (error) {
            console.error('Error decoding token:', error);
            return null;
        }
    };

    // Helper function to check if token is expired or will expire soon
    const isTokenExpiredOrExpiringSoon = (expiry, bufferMinutes = 5) => {
        if (!expiry) return true;
        const now = Date.now();
        const bufferTime = bufferMinutes * 60 * 1000;
        return expiry <= (now + bufferTime);
    };

    // Helper function to clear auth state
    const clearAuthState = () => {
        setAccessToken(null);
        setUser(null);
        setTokenExpiry(null);
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_expiry');
    };

    // Normalize user object to ensure name/fullName are available for UI
    const normalizeUser = (u) => {
        if (!u) return u;
        const fullNameFromParts = (u.firstName || u.lastName) ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : null;
        const fullName = u.fullName || fullNameFromParts || u.name || null;
        const name = u.name || fullName;
        return { ...u, fullName, name };
    };

    // NEW: Function to check session using /auth/me endpoint
    const checkAuthStatus = async () => {
        try {
            const response = await axios.get(
                `${baseURL}/api/user/auth/me`,
                { withCredentials: true }
            );

            if (response.data.success && response.data.user) {
                const userData = response.data.user;

                // Set user data from /auth/me response
                const normalizedUser = normalizeUser(userData);
                setUser(normalizedUser);

                // Note: /auth/me doesn't return accessToken, so we'll get it on first API call
                // The axios interceptor will handle getting a fresh token when needed
                setAccessToken('session-valid'); // Placeholder to indicate valid session

                // Save to localStorage
                localStorage.setItem('auth_user', JSON.stringify(normalizedUser));
                localStorage.setItem('auth_token', 'session-valid');
                localStorage.removeItem('auth_expiry'); // No expiry for session-valid

                return userData; // Return the user data
            } else {
                // If success is false or user is null, explicitly clear auth state
                clearAuthState();
                return null;
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            // Clear state on authentication errors
            if (error.response?.status === 401 || error.response?.status === 403) {
                clearAuthState();
            }
            return false;
        }
    };

    // Load auth state from localStorage on mount
    useEffect(() => {
        const loadAuthFromStorage = async () => {
            try {
                const storedUser = localStorage.getItem('auth_user');
                const storedToken = localStorage.getItem('auth_token');
                const storedExpiry = localStorage.getItem('auth_expiry');

                // First, try to load from localStorage
                if (storedUser && storedToken) {
                    setUser(JSON.parse(storedUser));
                    setAccessToken(storedToken);
                    setTokenExpiry(storedExpiry ? parseInt(storedExpiry) : null);
                    setLoading(false);
                    return;
                }

                // If no localStorage data, check server session (important for iOS PWA)
                // This handles the case where iOS PWA clears localStorage between sessions
                await checkAuthStatus();
            } catch (error) {
                console.error('Error loading auth from storage:', error);
            } finally {
                setLoading(false);
            }
        };

        loadAuthFromStorage();
    }, []);

    const refreshAccessToken = async (force = false) => {
        try {
            // Only refresh if token is expired/expiring soon, unless forced
            if (!force && tokenExpiry && !isTokenExpiredOrExpiringSoon(tokenExpiry)) {
                return accessToken; // Return existing token if still valid
            }

            const response = await axios.post(
                `${baseURL}/api/school/auth/refresh-token`,
                {},
                { withCredentials: true }
            );

            if (response.data.success) {
                const userData = response.data.data.user;
                const newToken = response.data.data.tokens.accessToken;
                const expiry = getTokenExpiry(newToken);
                const normalizedUser = normalizeUser(userData);

                setAccessToken(newToken);
                setUser(normalizedUser);
                setTokenExpiry(expiry);

                // Save to localStorage
                localStorage.setItem('auth_user', JSON.stringify(normalizedUser));
                localStorage.setItem('auth_token', newToken);
                localStorage.setItem('auth_expiry', expiry?.toString() || '');

                return newToken;
            }
            return null;
        } catch (error) {
            console.error('Token refresh failed:', error);
            // Only clear auth state if it's an authentication error
            if (error.response?.status === 401 || error.response?.status === 403) {
                clearAuthState();
            }
            return null;
        }
    };

    // Function to get a valid access token (refreshes if needed)
    const getValidAccessToken = async () => {
        // If we don't have a token or it's expired, refresh it
        if (!accessToken || accessToken === 'session-valid' ||
            (tokenExpiry && isTokenExpiredOrExpiringSoon(tokenExpiry))) {
            return await refreshAccessToken(true);
        }

        return accessToken;
    };

    // Login function
    const login = async (loginData) => {
        const token = loginData.data.tokens.accessToken;
        const expiry = getTokenExpiry(token);
        const normalizedUser = normalizeUser(loginData.data.user);

        setAccessToken(token);
        setUser(normalizedUser);
        setTokenExpiry(expiry);

        // Save to localStorage
        localStorage.setItem('auth_user', JSON.stringify(normalizedUser));
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_expiry', expiry?.toString() || '');

    };

    // Logout function
    const logout = async () => {
        try {
            await axios.post(`${baseURL}/api/school/auth/logout`, {}, {
                withCredentials: true
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            await clearSWUserCache();
            clearAuthState();
        }
    };

    // Set up automatic token refresh before expiry
    useEffect(() => {
        if (!tokenExpiry || !accessToken || accessToken === 'session-valid') return;

        const timeUntilExpiry = tokenExpiry - Date.now();
        const refreshTime = Math.max(timeUntilExpiry - (5 * 60 * 1000), 1000);

        const timer = setTimeout(() => {
            refreshAccessToken(true);
        }, refreshTime);

        return () => clearTimeout(timer);
    }, [tokenExpiry, accessToken]);

    const value = {
        user,
        accessToken,
        loading,
        login,
        logout,
        refreshAccessToken,
        checkAuthStatus,
        getValidAccessToken,
        isAuthenticated: !!user && !!accessToken
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};