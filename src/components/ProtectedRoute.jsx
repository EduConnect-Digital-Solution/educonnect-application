// src/components/ProtectedRoute.jsx
import { PageLoader } from '@/components/brand/BrandLoader.jsx';
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocaleReady } from '../contexts/LocaleReadyContext.js';


const ProtectedRoute = ({ children, requiredRole = null }) => {
    const { isAuthenticated, user, loading } = useAuth();
    const location = useLocation();
    const localeReady = useLocaleReady();

    if (loading) {
        return (
            <PageLoader />
        );
    }

    if (!isAuthenticated) {
        // Redirect to login with return URL
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    if (requiredRole && user?.role !== requiredRole) {
        // Redirect to appropriate dashboard if role doesn't match
        const home = ['admin', 'teacher', 'parent'].includes(user?.role) ? `/dashboard/${user.role}` : '/';
        return <Navigate to={home} replace />;
    }

    // Wait for the school's currency, timezone and date format before painting a page that shows them
    if (!localeReady) {
        return (
            <PageLoader />
        );
    }

    return children;
};

export default ProtectedRoute;