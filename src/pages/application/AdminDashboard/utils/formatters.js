import { formatSchoolDate, formatSchoolDateTime } from '../../../../utils/schoolLocale.js';
export const getInitials = (name) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
};

export const formatDate = (dateString) => formatSchoolDateTime(dateString);

export const formatYear = (dateString) => formatSchoolDate(dateString);

/**
 * Money helpers — re-exported from the fee domain layer so the whole dashboard
 * shares ONE implementation (single source of truth, no duplicate logic).
 * Amounts are always handled in kobo (integer); ₦ display only via formatNaira.
 */
export { formatNaira, toKobo } from '../services/feeAPIs.js';

export const formatStatus = (status) => {
    // Handle Booleans
    if (typeof status === 'boolean') {
        return status ? 'Active' : 'Inactive';
    }

    // Handle Strings (ensure they exist and aren't empty)
    if (typeof status === 'string' && status.trim().length > 0) {
        return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }

    // Fallback for null, undefined, or unexpected types
    return 'N/A';
};
