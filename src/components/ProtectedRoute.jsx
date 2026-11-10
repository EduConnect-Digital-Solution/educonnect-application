// src/components/ProtectedRoute.jsx
import { PageLoader } from '@/components/brand/BrandLoader.jsx';
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';


const ProtectedRoute = ({ children, requiredRole = null }) => {
    const { isAuthenticated, user, loading } = useAuth();
    const location = useLocation();

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
        return <Navigate to={`/dashboard/${user.role}`} replace />;
    }

    return children;
};

export default ProtectedRoute;