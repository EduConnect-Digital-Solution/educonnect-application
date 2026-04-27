// This file centralizes all API calls for the parent dashboard feature.
// It re-exports functions from the main authAPIs services to provide
// a single point of access for all parent-related data fetching.

export {
    getParentDashboard,
    getStudentInfo,
    getParentProfile,
} from '../../../auth/authAPIs.js';
