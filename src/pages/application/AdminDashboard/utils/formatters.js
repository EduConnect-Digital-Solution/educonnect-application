export const getInitials = (name) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
};

export const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

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
