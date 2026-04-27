// This file centralizes all API calls for the admin dashboard feature.
// It re-exports functions from the main authAPIs services to provide
// a single point of access for all admin-related data fetching.

export {
    getDashboardAnalytics,
    getInvitations,
    getDashboardUsers,
    inviteTeacher,
    inviteParent,
    createStudent,
    getAllStudents,
    resendInvitation,
    terminateInvitation,
} from '../../../auth/authAPIs.js';
