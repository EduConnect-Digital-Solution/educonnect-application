import React, { lazy, useEffect} from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { PWAProvider } from './contexts/PWAContext.jsx';

// Components
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import {AuthLayout} from "./components/auth/AuthLayout.jsx";
import {
    PWAInstallPrompt,
    PWAUpdateBanner,
    OfflineBanner,
    PWAInstalledToast,
} from './components/pwa';


const AuthPage = lazy(() => import("./pages/auth/AuthPage.jsx"));
const CompleteRegistration = lazy(() => import("./pages/auth/UserRegistration/CompleteRegistration"));
const RegisterSchool = lazy(() => import("./pages/auth/RegisterSchool.jsx").then(m => ({ default: m.RegisterSchool })));

// Admin Pages
const DashboardPage = lazy(() => import("./pages/application/AdminDashboard/pages/DashboardPage.jsx"));
const UserManagementPage = lazy(() => import("./pages/application/AdminDashboard/pages/UserManagementPage.jsx"));
const Students = lazy(() => import("./pages/application/AdminDashboard/pages/StudentManagement.jsx"));
const SchoolProfilePage = lazy(() => import("./pages/application/AdminDashboard/pages/SchoolProfilePage.jsx"));
const AdminProfilePage = lazy(() => import("./pages/application/AdminDashboard/pages/AdminProfilePage.jsx"));

// Parent Pages
const ParentDashboard = lazy(() => import("./pages/application/ParentDashboard/ParentDashboard.jsx"));
const ChildSelectionPage = lazy(() => import("./pages/application/ParentDashboard/MyChildren.jsx"));
const ParentProfilePage = lazy(() => import("./pages/application/ParentDashboard/ParentProfilePage.jsx"));

// Teacher Pages
const TeacherDashboard = lazy(() => import("./pages/application/TeacherDashboard/TeacherDashboard.jsx"));
const TeacherProfile = lazy(() => import("./pages/application/TeacherDashboard/UserProfile.jsx"));
const ClassStudents = lazy(() => import("./pages/application/TeacherDashboard/ClassStudents.jsx"));
const TeacherClasses = lazy(() => import("./pages/application/TeacherDashboard/TeacherClasses.jsx"));

const LoadingFallback = () => (
    <div className="h-screen w-full flex items-center justify-center font-[Outfit]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
);

// TODO: Add Skeleton Loaders

/**
 * AuthContextBridge
 *
 * Makes auth context available to axios interceptors AND wires
 * clearUserCache from PWAContext so cache is cleared on logout.
 */
const AuthContextBridge = ({ children }) => {
    const auth = useAuth();

    useEffect(() => {
        window.authContext = auth;
        return () => {
            delete window.authContext;
        };
    }, [auth]);

    return children;
};


function AppRoutes() {
    const { isLoading } = useAuth();

    if (isLoading) {
        return <LoadingFallback />;
    }
    const isInDashboard = location.pathname.startsWith('/dashboard');

    // TODO: add a bottom bar for cookie policy with accept button
    return (
        <div className={`font-[Inter]`}>

            <Routes>
                <Route path="/" element={<AuthPage />} />
                <Route path="/complete-registration" element={<CompleteRegistration />} />
                <Route element={<AuthLayout />}>
                    <Route path="/register/school" element={<RegisterSchool />} />
                    <Route path="/register" element={<Navigate to="/register/school" />} />
                </Route>

                {/* Admin Protected Routes */}
                <Route path="/dashboard/admin" element={<ProtectedRoute requiredRole="admin"><DashboardPage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/school-profile" element={<ProtectedRoute requiredRole="admin"><SchoolProfilePage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/profile" element={<ProtectedRoute requiredRole="admin"><AdminProfilePage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/users" element={<ProtectedRoute requiredRole="admin"><UserManagementPage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/users/parents" element={<ProtectedRoute requiredRole="admin"><UserManagementPage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/students" element={<ProtectedRoute requiredRole="admin"><Students /></ProtectedRoute>} />
                <Route path="/dashboard/admin/users/teachers" element={<ProtectedRoute requiredRole="admin"><UserManagementPage /></ProtectedRoute>} />

                {/* Parent Protected Routes */}
                <Route path="/dashboard/parent" element={<ProtectedRoute requiredRole="parent"><ParentDashboard /></ProtectedRoute>}/>
                <Route path="/dashboard/parent/children" element={<ProtectedRoute requiredRole="parent"><ChildSelectionPage /></ProtectedRoute>} />
                <Route path="/dashboard/parent/profile" element={<ProtectedRoute requiredRole="parent"><ParentProfilePage /></ProtectedRoute>} />

                {/* Teacher Protected Routes */}
                <Route path="/dashboard/teacher" element={<ProtectedRoute requiredRole="teacher"><TeacherDashboard /></ProtectedRoute>} />
                <Route path="/dashboard/teacher/profile" element={<ProtectedRoute requiredRole="teacher"><TeacherProfile /></ProtectedRoute>} />
                <Route path="/dashboard/teacher/classes" element={<ProtectedRoute requiredRole="teacher"><TeacherClasses /></ProtectedRoute>} />
                <Route path="/dashboard/teacher/students/:class/:subject" element={<ProtectedRoute requiredRole="teacher"><ClassStudents /></ProtectedRoute>} />

            </Routes>


            <PWAUpdateBanner />
            <PWAInstallPrompt />
            <OfflineBanner />
            <PWAInstalledToast />
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <PWAProvider>
                <AuthContextBridge>
                    <AppRoutes />
                </AuthContextBridge>
            </PWAProvider>
        </AuthProvider>
    );
}

export default App;