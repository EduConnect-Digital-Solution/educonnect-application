export const getRoleBadgeStyle = (role) => {
    const styles = {
        teacher: 'bg-blue-100 text-blue-700',
        parent: 'bg-purple-100 text-purple-700',
        admin: 'bg-red-100 text-red-700',
        student: 'bg-green-100 text-green-700'
    };
    return styles[role] || 'bg-gray-100 text-gray-700';
};

export const getStatusBadgeStyle = (status) => {
    const styles = {
        Active: 'bg-green-100 text-green-700',
        Inactive: 'bg-gray-100 text-gray-700',
        Suspended: 'bg-red-100 text-red-700',
        Pending: 'bg-yellow-100 text-yellow-700'
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
};
