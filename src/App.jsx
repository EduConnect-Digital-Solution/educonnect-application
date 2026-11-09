import React, { lazy, useEffect} from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { PWAProvider } from './contexts/PWAContext.jsx';
import { AcademicProvider } from './contexts/AcademicContext.jsx';

// Components
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import {AuthLayout} from "./components/auth/AuthLayout.jsx";
import {
    PWAInstallPrompt,
    PWAUpdateBanner,
    OfflineBanner,
    PWAInstalledToast,
} from './components/pwa';

// StandAlone Pages
const AuthPage             = lazy(() => import("./pages/auth/AuthPage.jsx"));
const CompleteRegistration = lazy(() => import("./pages/auth/UserRegistration/CompleteRegistration"));
const RegisterSchool       = lazy(() => import("./pages/auth/RegisterSchool.jsx").then(m => ({ default: m.RegisterSchool })));
const VerifySchool         = lazy(() => import("./pages/auth/VerifySchool.jsx").then(m => ({ default: m.VerifySchool })));

// Admin Pages
const AdminHome           = lazy(() => import("./pages/application/AdminDashboard/pages/AdminHome.jsx"));
const SetupChecklistPage  = lazy(() => import("./pages/application/AdminDashboard/pages/onboarding/SetupChecklistPage.jsx"));
const TeacherManagement   = lazy(() => import("./pages/application/AdminDashboard/pages/TeacherManagement.jsx"));
const ParentManagement    = lazy(() => import("./pages/application/AdminDashboard/pages/ParentManagement.jsx"));
const StudentManagement   = lazy(() => import("./pages/application/AdminDashboard/pages/StudentManagement.jsx"));
const SchoolProfilePage   = lazy(() => import("./pages/application/AdminDashboard/pages/SchoolProfilePage.jsx"));
const AdminProfilePage    = lazy(() => import("./pages/application/AdminDashboard/pages/AdminProfilePage.jsx"));
const SubjectsPage        = lazy(() => import("./pages/application/AdminDashboard/pages/config/SubjectsPage.jsx"));
const ClassesPage         = lazy(() => import("./pages/application/AdminDashboard/pages/config/ClassesPage.jsx"));
const SubjectGradingViewPage = lazy(() => import("./pages/application/AdminDashboard/pages/academics/grading/SubjectGradingViewPage.jsx"));
const CalendarPage        = lazy(() => import("./pages/application/AdminDashboard/pages/config/CalendarPage.jsx"));
const TimetableLibraryPage = lazy(() => import("./pages/application/AdminDashboard/pages/config/TimetableLibraryPage.jsx"));
const TimetablePage       = lazy(() => import("./pages/application/AdminDashboard/pages/config/TimetablePage.jsx"));
const TimetableViewPage   = lazy(() => import("./pages/application/AdminDashboard/pages/config/TimetableViewPage.jsx"));
const EventPage           = lazy(() => import("./pages/application/AdminDashboard/pages/config/EventPage.jsx"));
const FeeOverviewPage     = lazy(() => import("./pages/application/AdminDashboard/pages/fees/FeeOverviewPage.jsx"));
const FeeStructuresPage   = lazy(() => import("./pages/application/AdminDashboard/pages/fees/FeeStructuresPage.jsx"));
const FeeInvoicesPage     = lazy(() => import("./pages/application/AdminDashboard/pages/fees/FeeInvoicesPage.jsx"));
const FeePaymentsPage     = lazy(() => import("./pages/application/AdminDashboard/pages/fees/FeePaymentsPage.jsx"));
const FeeReportsPage      = lazy(() => import("./pages/application/AdminDashboard/pages/fees/FeeReportsPage.jsx"));
const AdmissionsPage      = lazy(() => import("./pages/application/AdminDashboard/pages/people/AdmissionsPage.jsx"));
const GradingPage         = lazy(() => import("./pages/application/AdminDashboard/pages/academics/GradingPage.jsx"));
const ReportCardsPage     = lazy(() => import("./pages/application/AdminDashboard/pages/academics/ReportCardsPage.jsx"));
const AdminAttendancePage = lazy(() => import("./pages/application/AdminDashboard/pages/AttendanceOpsPage.jsx"));
// const DefaultersPage      = lazy(() => import("./pages/application/AdminDashboard/pages/fees/DefaultersPage.jsx"));
const AnnouncementsPage   = lazy(() => import("./pages/application/AdminDashboard/pages/communication/AnnouncementsPage.jsx"));
const DeliveryLogsPage    = lazy(() => import("./pages/application/AdminDashboard/pages/communication/DeliveryLogsPage.jsx"));
const ReportsHubPage      = lazy(() => import("./pages/application/AdminDashboard/pages/ReportsHubPage.jsx"));
const SettingsHubPage              = lazy(() => import("./pages/application/AdminDashboard/pages/settings/SettingsHubPage.jsx"));
const GradingSetupSettingsPage = lazy(() => import("./pages/application/AdminDashboard/pages/settings/GradingSetupSettingsPage.jsx"));
const ApprovalsPage       = lazy(() => import("./pages/application/AdminDashboard/pages/ApprovalsPage.jsx"));
const StudentProfilePage  = lazy(() => import("./pages/application/AdminDashboard/pages/people/StudentProfilePage.jsx"));
const StaffProfilePage    = lazy(() => import("./pages/application/AdminDashboard/pages/people/StaffProfilePage.jsx"));
const GuardianProfilePage = lazy(() => import("./pages/application/AdminDashboard/pages/people/GuardianProfilePage.jsx"));
const InvoiceDetailPage   = lazy(() => import("./pages/application/AdminDashboard/pages/fees/InvoiceDetailPage.jsx"));
const PaymentDetailPage   = lazy(() => import("./pages/application/AdminDashboard/pages/fees/PaymentDetailPage.jsx"));

// Parent Pages
const ParentDashboard    = lazy(() => import("./pages/application/ParentDashboard/ParentDashboard.jsx"));
const ChildSelectionPage = lazy(() => import("./pages/application/ParentDashboard/MyChildren.jsx"));
const ParentProfilePage  = lazy(() => import("./pages/application/ParentDashboard/ParentProfilePage.jsx"));
const ParentFeesPage     = lazy(() => import("./pages/application/ParentDashboard/FeesAndPayments.jsx"));

// Teacher Pages
const TeacherDashboard       = lazy(() => import("./pages/application/TeacherDashboard/TeacherDashboard.jsx"));
const TeacherProfile         = lazy(() => import("./pages/application/TeacherDashboard/UserProfile.jsx"));
const ClassStudents          = lazy(() => import("./pages/application/TeacherDashboard/ClassStudents.jsx"));
const TeacherClasses         = lazy(() => import("./pages/application/TeacherDashboard/TeacherClasses.jsx"));
const AttendancePage         = lazy(() => import("./pages/application/TeacherDashboard/AttendancePage.jsx"));
const AttendanceRegisterPage = lazy(() => import("./pages/application/TeacherDashboard/AttendanceRegisterPage.jsx"));
const ScoreEntryPage                 = lazy(() => import("./pages/application/TeacherDashboard/ScoreEntryPage.jsx"));
const TeacherAssessmentPoliciesPage  = lazy(() => import("./pages/application/TeacherDashboard/TeacherAssessmentPoliciesPage.jsx"));



const LoadingFallback = () => (
    <div className="h-screen w-full flex items-center justify-center font-[Outfit]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
);

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

    return (
        <div className={`font-[Inter]`}>
            <React.Suspense fallback={<LoadingFallback />}>
                <Routes>
                <Route path="/" element={<AuthPage />} />
                <Route path="/complete-registration" element={<CompleteRegistration />} />
                <Route element={<AuthLayout />}>
                    <Route path="/register/school" element={<RegisterSchool />} />
                    <Route path="/verify/school" element={<VerifySchool />} />
                    <Route path="/register" element={<Navigate to="/register/school" />} />
                </Route>

                {/* ── Admin — canonical IA (job-to-be-done) ─────────────────── */}
                <Route path="/dashboard/admin" element={<ProtectedRoute requiredRole="admin"><AdminHome /></ProtectedRoute>} />
                <Route path="/dashboard/admin/setup" element={<ProtectedRoute requiredRole="admin"><SetupChecklistPage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/profile" element={<ProtectedRoute requiredRole="admin"><AdminProfilePage /></ProtectedRoute>} />

                {/* People */}
                <Route path="/dashboard/admin/people/students"   element={<ProtectedRoute requiredRole="admin"><StudentManagement /></ProtectedRoute>} />
                <Route path="/dashboard/admin/people/students/:studentId" element={<ProtectedRoute requiredRole="admin"><StudentProfilePage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/people/staff/:staffId" element={<ProtectedRoute requiredRole="admin"><StaffProfilePage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/people/guardians"  element={<ProtectedRoute requiredRole="admin"><ParentManagement /></ProtectedRoute>} />
                <Route path="/dashboard/admin/people/guardians/:guardianId" element={<ProtectedRoute requiredRole="admin"><GuardianProfilePage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/people/staff"      element={<ProtectedRoute requiredRole="admin"><TeacherManagement /></ProtectedRoute>} />
                <Route path="/dashboard/admin/people/admissions" element={<ProtectedRoute requiredRole="admin"><AdmissionsPage /></ProtectedRoute>} />

                {/* Academics */}
                <Route path="/dashboard/admin/academics/classes"            element={<ProtectedRoute requiredRole="admin"><ClassesPage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/academics/subjects"           element={<ProtectedRoute requiredRole="admin"><SubjectsPage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/academics/grading"            element={<ProtectedRoute requiredRole="admin"><GradingPage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/academics/grading/subject-view" element={<ProtectedRoute requiredRole="admin"><SubjectGradingViewPage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/academics/report-cards"       element={<ProtectedRoute requiredRole="admin"><ReportCardsPage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/academics/timetables"         element={<ProtectedRoute requiredRole="admin"><TimetableLibraryPage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/academics/timetables/view"    element={<ProtectedRoute requiredRole="admin"><TimetableViewPage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/academics/timetables/builder" element={<ProtectedRoute requiredRole="admin"><TimetablePage /></ProtectedRoute>} />

                {/* Attendance */}
                <Route path="/dashboard/admin/attendance" element={<ProtectedRoute requiredRole="admin"><AdminAttendancePage /></ProtectedRoute>} />

                {/* Finance */}
                <Route path="/dashboard/admin/finance/overview"   element={<ProtectedRoute requiredRole="admin"><FeeOverviewPage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/finance/structures" element={<ProtectedRoute requiredRole="admin"><FeeStructuresPage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/finance/invoices"   element={<ProtectedRoute requiredRole="admin"><FeeInvoicesPage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/finance/invoices/:invoiceId" element={<ProtectedRoute requiredRole="admin"><InvoiceDetailPage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/finance/payments"   element={<ProtectedRoute requiredRole="admin"><FeePaymentsPage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/finance/payments/:paymentId" element={<ProtectedRoute requiredRole="admin"><PaymentDetailPage /></ProtectedRoute>} />
                {/*<Route path="/dashboard/admin/finance/defaulters" element={<ProtectedRoute requiredRole="admin"><DefaultersPage /></ProtectedRoute>} />*/}
                <Route path="/dashboard/admin/finance/reports"    element={<ProtectedRoute requiredRole="admin"><FeeReportsPage /></ProtectedRoute>} />

                {/* Communication */}
                <Route path="/dashboard/admin/communication/announcements" element={<ProtectedRoute requiredRole="admin"><AnnouncementsPage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/communication/events"        element={<ProtectedRoute requiredRole="admin"><EventPage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/communication/delivery-logs" element={<ProtectedRoute requiredRole="admin"><DeliveryLogsPage /></ProtectedRoute>} />

                {/* Reports */}
                <Route path="/dashboard/admin/reports" element={<ProtectedRoute requiredRole="admin"><ReportsHubPage /></ProtectedRoute>} />

                {/* Approvals */}
                <Route path="/dashboard/admin/approvals" element={<ProtectedRoute requiredRole="admin"><ApprovalsPage /></ProtectedRoute>} />

                {/* Settings */}
                <Route path="/dashboard/admin/settings"                          element={<ProtectedRoute requiredRole="admin"><SettingsHubPage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/settings/identity"                 element={<ProtectedRoute requiredRole="admin"><SchoolProfilePage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/settings/academic"                 element={<ProtectedRoute requiredRole="admin"><CalendarPage /></ProtectedRoute>} />
                <Route path="/dashboard/admin/settings/grading"                  element={<ProtectedRoute requiredRole="admin"><GradingSetupSettingsPage /></ProtectedRoute>} />

                {/* ── Admin — legacy redirects (old URLs keep working) ──────── */}
                <Route path="/dashboard/admin/users"             element={<Navigate to="/dashboard/admin/people/students" replace />} />
                <Route path="/dashboard/admin/users/teachers"    element={<Navigate to="/dashboard/admin/people/staff" replace />} />
                <Route path="/dashboard/admin/users/parents"     element={<Navigate to="/dashboard/admin/people/guardians" replace />} />
                <Route path="/dashboard/admin/users/students"    element={<Navigate to="/dashboard/admin/people/students" replace />} />
                <Route path="/dashboard/admin/fees"              element={<Navigate to="/dashboard/admin/finance/overview" replace />} />
                <Route path="/dashboard/admin/fees/overview"     element={<Navigate to="/dashboard/admin/finance/overview" replace />} />
                <Route path="/dashboard/admin/fees/structures"   element={<Navigate to="/dashboard/admin/finance/structures" replace />} />
                <Route path="/dashboard/admin/fees/invoices"     element={<Navigate to="/dashboard/admin/finance/invoices" replace />} />
                <Route path="/dashboard/admin/fees/payments"     element={<Navigate to="/dashboard/admin/finance/payments" replace />} />
                <Route path="/dashboard/admin/fees/reports"      element={<Navigate to="/dashboard/admin/finance/reports" replace />} />
                <Route path="/dashboard/admin/config"            element={<Navigate to="/dashboard/admin/academics/subjects" replace />} />
                <Route path="/dashboard/admin/config/subjects"   element={<Navigate to="/dashboard/admin/academics/subjects" replace />} />
                <Route path="/dashboard/admin/config/classes"    element={<Navigate to="/dashboard/admin/academics/classes" replace />} />
                <Route path="/dashboard/admin/config/calendar"   element={<Navigate to="/dashboard/admin/settings/academic" replace />} />
                <Route path="/dashboard/admin/settings/assessment-policies" element={<Navigate to="/dashboard/admin/settings/grading" replace />} />
                <Route path="/dashboard/admin/config/timetable"  element={<Navigate to="/dashboard/admin/academics/timetables/builder" replace />} />
                <Route path="/dashboard/admin/timetable-library" element={<Navigate to="/dashboard/admin/academics/timetables" replace />} />
                <Route path="/dashboard/admin/school-profile"    element={<Navigate to="/dashboard/admin/settings/identity" replace />} />
                <Route path="/dashboard/admin/events-planner"    element={<Navigate to="/dashboard/admin/communication/events" replace />} />
                <Route path="/dashboard/admin/people"            element={<Navigate to="/dashboard/admin/people/students" replace />} />
                <Route path="/dashboard/admin/academics"         element={<Navigate to="/dashboard/admin/academics/classes" replace />} />
                <Route path="/dashboard/admin/finance"           element={<Navigate to="/dashboard/admin/finance/overview" replace />} />
                <Route path="/dashboard/admin/communication"     element={<Navigate to="/dashboard/admin/communication/announcements" replace />} />

                {/* Parent Protected Routes */}
                <Route path="/dashboard/parent" element={<ProtectedRoute requiredRole="parent"><ParentDashboard /></ProtectedRoute>}/>
                <Route path="/dashboard/parent/children" element={<ProtectedRoute requiredRole="parent"><ChildSelectionPage /></ProtectedRoute>} />
                <Route path="/dashboard/parent/fees" element={<ProtectedRoute requiredRole="parent"><ParentFeesPage /></ProtectedRoute>} />
                <Route path="/dashboard/parent/profile" element={<ProtectedRoute requiredRole="parent"><ParentProfilePage /></ProtectedRoute>} />

                {/* Teacher Protected Routes */}
                <Route path="/dashboard/teacher" element={<ProtectedRoute requiredRole="teacher"><TeacherDashboard /></ProtectedRoute>} />
                <Route path="/dashboard/teacher/profile" element={<ProtectedRoute requiredRole="teacher"><TeacherProfile /></ProtectedRoute>} />
                <Route path="/dashboard/teacher/classes" element={<ProtectedRoute requiredRole="teacher"><TeacherClasses /></ProtectedRoute>} />
                <Route path="/dashboard/teacher/students/:class/:subject" element={<ProtectedRoute requiredRole="teacher"><ClassStudents /></ProtectedRoute>} />
                <Route path="/dashboard/teacher/attendance" element={<ProtectedRoute requiredRole="teacher"><AttendancePage /></ProtectedRoute>} />
                <Route path="/dashboard/teacher/attendance/register/:scheduleId" element={<ProtectedRoute requiredRole="teacher"><AttendanceRegisterPage /></ProtectedRoute>} />
                <Route path="/dashboard/teacher/score-entry" element={<ProtectedRoute requiredRole="teacher"><ScoreEntryPage /></ProtectedRoute>} />
                <Route path="/dashboard/teacher/assessment-policies" element={<ProtectedRoute requiredRole="teacher"><TeacherAssessmentPoliciesPage /></ProtectedRoute>} />

                <Route path="*" element={<Navigate to="/" />} />

                </Routes>
            </React.Suspense>

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
                    <AcademicProvider>
                        <AppRoutes />
                    </AcademicProvider>
                </AuthContextBridge>
            </PWAProvider>
        </AuthProvider>
    );
}

export default App;